import {
  BadRequestException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { translateValidationErrors } from './common/validation/validation-messages';

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
      // Validation errors reach the UI, so they are returned in Portuguese.
      exceptionFactory: (errors) =>
        new BadRequestException(translateValidationErrors(errors)),
    }),
  );
}
