import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CookieJar } from 'tough-cookie';
import { request } from 'undici';
import { chain } from 'stream-chain';
import { parser } from 'stream-json';
import { pick } from 'stream-json/filters/Pick';
import { streamArray } from 'stream-json/streamers/StreamArray';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Talks to CKAuto with our own partner account. See docs/ckauto-api.md.
 *
 * The whole dataset is one GET /api/app/state (~18 MB, ~13k vehicles when
 * logged in, no pagination), so each run is a full snapshot. It is
 * stream-parsed: vehicles are yielded one at a time and the body is never held
 * in memory as a whole.
 *
 * Deliberately polite: one request at a time, with a delay after each.
 */
@Injectable()
export class SourceClientService {
  private readonly log = new Logger(SourceClientService.name);
  private jar = new CookieJar();
  private authedAt?: number;

  constructor(private readonly config: ConfigService) {}

  private get baseUrl(): string {
    return this.config.get<string>('SOURCE_BASE_URL') ?? 'https://ckauto.co.kr';
  }

  private path(key: string, fallback: string): string {
    return this.config.get<string>(key) || fallback;
  }

  private get delayMs(): number {
    return Number(this.config.get('REQUEST_DELAY_MS') ?? 1500);
  }

  private async cookieHeader(url: string): Promise<Record<string, string>> {
    const cookie = await this.jar.getCookieString(url);
    return cookie ? { cookie } : {};
  }

  private async storeCookies(url: string, setCookie: string | string[] | undefined) {
    for (const raw of [setCookie ?? []].flat()) await this.jar.setCookie(raw, url);
  }

  /**
   * Cookie-session login: GET csrf, then POST credentials with the token in
   * X-CSRF-Token. Starts from an empty jar so a stale session cannot leak in.
   */
  async login(): Promise<void> {
    this.jar = new CookieJar();
    this.authedAt = undefined;

    const csrfUrl = new URL(this.path('SOURCE_CSRF_PATH', '/api/auth/csrf'), this.baseUrl).toString();
    const csrfRes = await request(csrfUrl, { headers: { accept: 'application/json' } });
    await this.storeCookies(csrfUrl, csrfRes.headers['set-cookie']);
    const csrfBody = (await csrfRes.body.json().catch(() => ({}))) as Record<string, any>;
    if (csrfRes.statusCode >= 400) throw new Error(`CSRF request failed with status ${csrfRes.statusCode}`);

    // The token's key is not in the capture; accept the usual spellings, and
    // the double-submit cookie pattern as a fallback. Fail loudly otherwise.
    const cookies = await this.jar.getCookies(csrfUrl);
    const csrf: string | undefined =
      csrfBody.csrfToken ?? csrfBody.token ?? csrfBody.csrf ?? csrfBody.data?.csrfToken ??
      cookies.find((c) => /csrf|xsrf/i.test(c.key))?.value;
    if (!csrf) {
      throw new Error(`No CSRF token in ${csrfUrl}. Body keys: ${Object.keys(csrfBody).join(', ') || '(none)'}`);
    }
    await sleep(this.delayMs);

    const loginUrl = new URL(this.path('SOURCE_LOGIN_PATH', '/api/auth/login'), this.baseUrl).toString();
    const res = await request(loginUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        'x-csrf-token': csrf,
        ...(await this.cookieHeader(loginUrl)),
      },
      body: JSON.stringify({
        loginId: this.config.getOrThrow<string>('SOURCE_USERNAME'),
        password: this.config.getOrThrow<string>('SOURCE_PASSWORD'),
      }),
    });
    await this.storeCookies(loginUrl, res.headers['set-cookie']);
    const body = (await res.body.json().catch(() => ({}))) as Record<string, any>;
    await sleep(this.delayMs);

    // Never log the body: on some sites it echoes the login id.
    if (res.statusCode >= 400 || body.ok === false) {
      throw new Error(`Login failed with status ${res.statusCode}`);
    }
    if (!(await this.jar.getCookieString(loginUrl))) {
      throw new Error('Login returned no session cookie');
    }

    this.authedAt = Date.now();
    this.log.log('Authenticated against source site');
  }

  private async ensureAuth(): Promise<void> {
    const oneHour = 60 * 60 * 1000;
    if (!this.authedAt || Date.now() - this.authedAt > oneHour) await this.login();
  }

  /**
   * Yields every vehicle in the snapshot, one object at a time.
   *
   * Anonymous calls also succeed - with 271 rows and 16 of the 30 fields - so a
   * silently expired session would quietly shrink every record. The first
   * vehicle is therefore checked for a logged-in-only field and the run aborts
   * if it is missing, rather than ingesting the reduced data.
   */
  async *iterateListings(): AsyncGenerator<Record<string, unknown>> {
    await this.ensureAuth();
    const url = new URL(this.path('SOURCE_STATE_PATH', '/api/app/state'), this.baseUrl).toString();

    const res = await request(url, {
      headers: { accept: 'application/json', ...(await this.cookieHeader(url)) },
      headersTimeout: 60_000,
      bodyTimeout: 300_000,
    });
    if (res.statusCode === 401 || res.statusCode === 403) {
      this.authedAt = undefined;
      await res.body.dump();
      throw new Error(`Not authorised (${res.statusCode}) for ${new URL(url).pathname}`);
    }
    if (res.statusCode >= 400) {
      await res.body.dump();
      throw new Error(`Source returned ${res.statusCode} for ${new URL(url).pathname}`);
    }

    const vehicles = chain([res.body, parser(), pick({ filter: 'vehicles' }), streamArray()]);
    let count = 0;
    try {
      for await (const { value } of vehicles as AsyncIterable<{ value: Record<string, unknown> }>) {
        if (count === 0 && !('engineType' in value)) {
          this.authedAt = undefined;
          throw new Error('Snapshot is the anonymous view (no engineType) - session is not logged in');
        }
        count++;
        yield value;
      }
    } finally {
      vehicles.destroy();
    }

    if (count === 0) throw new Error(`Snapshot from ${new URL(url).pathname} contained no vehicles`);
    this.log.log(`Snapshot streamed: ${count} vehicles`);
    await sleep(this.delayMs);
  }

  /**
   * Fetches an image as bytes, with the same polite pacing. CKAuto serves
   * photos as static files with no auth, so no session is sent.
   */
  async fetchImage(imageUrl: string): Promise<Buffer> {
    const url = new URL(imageUrl, this.baseUrl).toString();
    const res = await request(url, { headersTimeout: 30_000, bodyTimeout: 60_000 });
    if (res.statusCode >= 400) {
      await res.body.dump();
      throw new Error(`Image fetch failed (${res.statusCode}): ${url}`);
    }
    const buf = Buffer.from(await res.body.arrayBuffer());
    await sleep(this.delayMs);
    return buf;
  }
}
