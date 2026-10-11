import { INestApplication, ValidationPipe } from '@nestjs/common';

/**
 * Application-level configuration shared by the real bootstrap (`main.ts`)
 * and the e2e tests, so both run with the same pipes and CORS settings.
 */
export function configureApp(app: INestApplication): void {
  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}
