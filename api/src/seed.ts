import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { SeederService } from './seed/seeder.service';

async function seed(): Promise<void> {
  process.env.SEED_STANDALONE = 'true';
  const force = process.argv.includes('--force');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

  try {
    await app.get(SeederService).run({ force });
    Logger.log(`seeding complete${force ? ' (forced)' : ''}`, 'Seed');
  } finally {
    await app.close();
  }
}

seed().catch((err) => {
  Logger.error(err, undefined, 'Seed');
  process.exit(1);
});
