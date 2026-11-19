'use strict';
/**
 * Serves the React build for autoauction.kr, and makes it visible to search
 * engines and link previews.
 *
 * The app is a client-rendered SPA, so on its own every URL returns the same
 * empty page. This server fills in each page's <head> before sending it:
 * title, description, canonical URL, Open Graph / Twitter tags and JSON-LD -
 * for car and news pages from the API. It also serves /sitemap.xml and
 * /robots.txt, and redirects www to the bare domain.
 *
 * Env: PORT (80), API_INTERNAL_URL (http://api:3000), SITE_URL (https://autoauction.kr), BUILD_DIR.
 */
const fs = require('fs');
const path = require('path');
const express = require('express');
const { staticMeta, carMeta, postMeta, notFoundMeta, renderHead, applyHead, esc } = require('./meta');

const PORT = Number(process.env.PORT || 80);
const API = (process.env.API_INTERNAL_URL || 'http://localhost:3000').replace(/\/+$/, '');
const SITE = (process.env.SITE_URL || 'https://autoauction.kr').replace(/\/+$/, '');
const SITE_HOST = new URL(SITE).hostname;
const BUILD = process.env.BUILD_DIR || path.join(__dirname, '..', 'build');
const TEMPLATE = fs.readFileSync(path.join(BUILD, 'index.html'), 'utf8');

// ---- small TTL cache for API reads -----------------------------------------
const cache = new Map();
async function cached(key, ttlMs, load) {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;
  const value = await load();
  if (cache.size > 1000) cache.delete(cache.keys().next().value);
  cache.set(key, { value, expires: Date.now() + ttlMs });
  return value;
}

/** GET the API as JSON. null for 404/400 (not found); throws on outages so we never cache them as "missing". */
async function api(pathname) {
  const res = await fetch(API + pathname, { signal: AbortSignal.timeout(5000), headers: { accept: 'application/json' } });
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) throw new Error(`API ${pathname} -> ${res.status}`);
  return res.json();
}

const OBJECT_ID = /^[a-f0-9]{24}$/i;
const KNOWN = /^\/(?:products(?:\/[^/]+)?|verify(?:\/[^/]+)?|help|news(?:\/[^/]+)?|member-page)?\/?$/;

async function metaFor(pathname) {
  const parts = pathname.split('/').filter(Boolean);

  if (parts[0] === 'products' && parts[1]) {
    if (!OBJECT_ID.test(parts[1])) return { status: 404, meta: notFoundMeta(SITE) };
    const car = await cached(`car:${parts[1]}`, 5 * 60_000, () => api(`/car/${parts[1]}`));
    if (!car || !car.id) return { status: 404, meta: notFoundMeta(SITE) };
    return { status: 200, meta: carMeta(car, SITE) };
  }

  if (parts[0] === 'news' && parts[1]) {
    if (!OBJECT_ID.test(parts[1])) return { status: 404, meta: notFoundMeta(SITE) };
    const post = await cached(`post:${parts[1]}`, 5 * 60_000, () => api(`/post/${parts[1]}`));
    if (!post || !post._id) return { status: 404, meta: notFoundMeta(SITE) };
    return { status: 200, meta: postMeta(post, SITE) };
  }

  if (!KNOWN.test(pathname)) return { status: 404, meta: notFoundMeta(SITE) };

  const meta = staticMeta(pathname, SITE);
  // One page per VIN would be thousands of near-empty pages: keep them out of the index.
  if (parts[0] === 'verify' && parts[1]) meta.noindex = true;
  return { status: 200, meta };
}

// ---- app ---------------------------------------------------------------------
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);

app.get('/healthz', (_req, res) => res.type('text').send('ok'));

app.use((req, res, next) => {
  const host = (req.hostname || '').toLowerCase();
  // One canonical host: www.autoauction.kr -> autoauction.kr (301 keeps rankings).
  if (host === `www.${SITE_HOST}`) return res.redirect(301, SITE + req.originalUrl);
  // Test/preview hostnames (e.g. new.autoauction.kr) must never be indexed.
  if (host && host !== SITE_HOST && host !== 'localhost' && host !== '127.0.0.1') res.set('X-Robots-Tag', 'noindex');
  res.set('X-Content-Type-Options', 'nosniff');
  next();
});

app.get('/robots.txt', (_req, res) => {
  res.type('text/plain').set('Cache-Control', 'public, max-age=3600');
  res.send(['User-agent: *', 'Disallow: /member-page', '', `Sitemap: ${SITE}/sitemap.xml`, ''].join('\n'));
});

app.get('/sitemap.xml', async (_req, res) => {
  try {
    const xml = await cached('sitemap', 60 * 60_000, async () => {
      const [cars, posts] = await Promise.all([
        api('/car/all?page=1&limit=1000&order=updatedAt').catch(() => []),
        api('/post/all?page=1&limit=500&order=updatedAt').catch(() => []),
      ]);
      const day = (d) => (d ? new Date(d).toISOString().slice(0, 10) : undefined);
      const urls = [
        { loc: `${SITE}/`, priority: '1.0', changefreq: 'daily' },
        { loc: `${SITE}/products`, priority: '0.9', changefreq: 'daily' },
        { loc: `${SITE}/news`, priority: '0.5', changefreq: 'weekly' },
        { loc: `${SITE}/help`, priority: '0.4', changefreq: 'monthly' },
        { loc: `${SITE}/verify`, priority: '0.3', changefreq: 'monthly' },
        ...(Array.isArray(cars) ? cars : [])
          .filter((c) => c && c.id)
          .map((c) => ({ loc: `${SITE}/products/${c.id}`, lastmod: day(c.updatedAt), priority: '0.8', changefreq: 'weekly' })),
        ...(Array.isArray(posts) ? posts : [])
          .filter((p) => p && p._id)
          .map((p) => ({ loc: `${SITE}/news/${p._id}`, lastmod: day(p.updatedAt), priority: '0.5', changefreq: 'monthly' })),
      ];
      return (
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
        urls
          .map(
            (u) =>
              `  <url><loc>${esc(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}` +
              `<changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`,
          )
          .join('\n') +
        '\n</urlset>\n'
      );
    });
    res.type('application/xml').set('Cache-Control', 'public, max-age=3600').send(xml);
  } catch (err) {
    console.error('sitemap failed:', err.message);
    res.status(503).type('text').send('Sitemap temporarily unavailable');
  }
});

// Hashed build assets never change: cache them for a year. Everything else briefly.
app.use(
  express.static(BUILD, {
    index: false,
    setHeaders: (res, file) => {
      res.set('Cache-Control', file.includes(`${path.sep}static${path.sep}`) ? 'public, max-age=31536000, immutable' : 'public, max-age=3600');
    },
  }),
);

// Missing files under /static or with an extension are real 404s, not the app.
app.get(/^\/static\/|\.[a-z0-9]{2,5}$/i, (_req, res) => res.status(404).type('text').send('Not found'));

app.get('*', async (req, res) => {
  let status = 200;
  let meta;
  try {
    ({ status, meta } = await metaFor(req.path));
  } catch (err) {
    // API down: still serve the app with generic tags rather than an error page.
    console.error(`meta for ${req.path} failed:`, err.message);
    meta = staticMeta('/', SITE);
    meta.canonical = '';
  }
  res
    .status(status)
    .type('html')
    .set('Cache-Control', 'no-cache')
    .send(applyHead(TEMPLATE, renderHead(meta)));
});

app.listen(PORT, () => console.log(`web listening on ${PORT} (API ${API}, site ${SITE})`));
