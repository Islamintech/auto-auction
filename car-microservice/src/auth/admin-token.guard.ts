import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

/**
 * Shared-secret guard for the admin API.
 *
 * The admin panel is the only caller, so a bearer token from ADMIN_API_TOKEN is
 * enough - no sessions, no user table. Two deliberate properties:
 *
 * 1. Fails closed. An unset or too-short token rejects every request rather
 *    than waving them through, so a missing .env cannot silently expose
 *    approve/reject to the internet.
 * 2. Compares in constant time, so a wrong token leaks nothing about how much
 *    of it was right.
 */
@Injectable()
export class AdminTokenGuard implements CanActivate {
  private readonly logger = new Logger(AdminTokenGuard.name);
  private readonly expected: Buffer | null;

  /** Short secrets are treated as unconfigured; a 4-char "token" is not one. */
  private static readonly MIN_TOKEN_LENGTH = 16;

  constructor(config: ConfigService) {
    const token = config.get<string>('ADMIN_API_TOKEN')?.trim();
    if (!token || token.length < AdminTokenGuard.MIN_TOKEN_LENGTH) {
      this.expected = null;
      this.logger.error(
        `ADMIN_API_TOKEN is unset or shorter than ${AdminTokenGuard.MIN_TOKEN_LENGTH} characters - all admin requests will be rejected.`,
      );
    } else {
      this.expected = Buffer.from(token, 'utf8');
    }
  }

  canActivate(context: ExecutionContext): boolean {
    if (!this.expected) {
      throw new UnauthorizedException('Admin API is not configured');
    }

    const req = context.switchToHttp().getRequest<Request>();
    const presented = this.extractToken(req);
    if (!presented) {
      throw new UnauthorizedException('Missing bearer token');
    }

    if (!this.matches(presented)) {
      this.logger.warn(`Rejected admin request to ${req.method} ${req.url}`);
      throw new UnauthorizedException('Invalid token');
    }
    return true;
  }

  private extractToken(req: Request): string | null {
    const header = req.headers.authorization;
    if (!header) return null;
    const [scheme, ...rest] = header.split(' ');
    if (scheme?.toLowerCase() !== 'bearer') return null;
    const value = rest.join(' ').trim();
    return value.length > 0 ? value : null;
  }

  private matches(presented: string): boolean {
    const given = Buffer.from(presented, 'utf8');
    // timingSafeEqual throws on a length mismatch, which is itself a leak-free
    // answer: different length means different token.
    if (given.length !== this.expected!.length) return false;
    return timingSafeEqual(given, this.expected!);
  }
}
