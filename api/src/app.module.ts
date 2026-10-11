import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './features/users/users.module';
import { AuthModule } from './features/auth/auth.module';
import { PositionsModule } from './features/positions/positions.module';
import { RequisitionsModule } from './features/requisitions/requisitions.module';
import { SeedModule } from './seed/seed.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'better-sqlite3' as const,
        database: config.get<string>('DATABASE_PATH') ?? 'data/app.sqlite',
        autoLoadEntities: true,
        synchronize: config.get<string>('NODE_ENV') !== 'production',
      }),
    }),
    UsersModule,
    AuthModule,
    PositionsModule,
    RequisitionsModule,
    SeedModule,
  ],
})
export class AppModule {}
