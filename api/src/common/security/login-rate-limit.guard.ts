import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface Window {
  count: number;
  resetAt: number;
}

/**
 * Limits login attempts per client and identifier (RNF04), so a password can
 * not be guessed quickly. In memory, which is enough for a single instance.
 * `LOGIN_RATE_LIMIT` attempts per `LOGIN_RATE_WINDOW_MS` (default 60 s);
 * `0` disables it. Defaults to 10 in production and off elsewhere.
 */
@Injectable()
export class LoginRateLimitGuard implements CanActivate {
  private readonly windows = new Map<string, Window>();

  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const limit = this.limit();
    if (limit <= 0) return true;

    const request = context.switchToHttp().getRequest();
    const identifier = String(request.body?.identifier ?? '').replace(/\D/g, '');
    const key = `${request.ip}|${identifier}`;
    const windowMs = Number(this.config.get('LOGIN_RATE_WINDOW_MS') ?? 60_000);
    const now = Date.now();

    let entry = this.windows.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      this.windows.set(key, entry);
      this.prune(now);
    }
    entry.count += 1;
    if (entry.count > limit) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Muitas tentativas de acesso. Aguarde um minuto e tente novamente.',
          error: 'Too Many Requests',
          code: 'TOO_MANY_ATTEMPTS',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }

  private limit(): number {
    const configured = this.config.get<string>('LOGIN_RATE_LIMIT');
    if (configured !== undefined && configured !== '') return Number(configured);
    return this.config.get<string>('NODE_ENV') === 'production' ? 10 : 0;
  }

  private prune(now: number): void {
    if (this.windows.size < 1000) return;
    for (const [key, value] of this.windows) {
      if (value.resetAt <= now) this.windows.delete(key);
    }
  }
}
