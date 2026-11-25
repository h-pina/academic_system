import { INestApplication } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

/** Minimum length of the JWT secret in production. */
export const MIN_PRODUCTION_SECRET_LENGTH = 32;

/**
 * Fails fast when the production configuration is unsafe (RNF04). Outside
 * production any configuration is accepted so development stays frictionless.
 */
export function assertSafeConfiguration(env: NodeJS.ProcessEnv): void {
  if (env.NODE_ENV !== 'production') return;
  const secret = env.JWT_SECRET ?? '';
  if (secret.length < MIN_PRODUCTION_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET must have at least ${MIN_PRODUCTION_SECRET_LENGTH} characters in production`,
    );
  }
}

/** Origins allowed by CORS: `CORS_ORIGIN` (comma separated) or every origin outside production. */
export function resolveCorsOrigins(env: NodeJS.ProcessEnv): string[] | true | false {
  const configured = (env.CORS_ORIGIN ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (configured.length > 0) return configured;
  return env.NODE_ENV === 'production' ? false : true;
}

/** Baseline security headers for an API (no dependency needed for these). */
export function securityHeaders(production: boolean) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    res.removeHeader('X-Powered-By');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
    if (production) {
      res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
    }
    next();
  };
}

export function applySecurity(app: INestApplication, env: NodeJS.ProcessEnv): void {
  app.use(securityHeaders(env.NODE_ENV === 'production'));
}
