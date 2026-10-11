import {
  BadRequestException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { translateFieldErrors } from './common/validation/validation-messages';

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
      exceptionFactory: (errors) => {
        const fieldErrors = translateFieldErrors(errors);
        return new BadRequestException({
          statusCode: 400,
          message: fieldErrors.map((entry) => entry.message),
          // The same failures keyed by property, so forms can mark each field.
          errors: fieldErrors,
          error: 'Bad Request',
        });
      },
    }),
  );
}
