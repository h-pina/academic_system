import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { setupApiDocs } from './app.docs';
import { assertSafeConfiguration } from './common/security/security';

async function bootstrap() {
  assertSafeConfiguration(process.env);
  const app = await NestFactory.create(AppModule);

  configureApp(app);
  setupApiDocs(app);

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
}

bootstrap();
