import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from 'prisma/prisma.module';
import { BullModule } from '@nestjs/bullmq';
import { UploadModule } from './upload/upload.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AuthModule } from './modules/auth/auth.module';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { OcaTicketSchedulerService } from './worker/scheduler/oca-ticket-scheduler.service';
import { DailyOcaTicketProcessor } from './worker/processor/daily-oca-ticket-processor';
import { OcaUpsertService } from './worker/repository/oca-upsert.service';
import { SchedulerModule } from './scheduler/scheduler.module';
import { IncidentModule } from './modules/incident/incident.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { NewsModule } from './modules/news/news.module';
import { LookupManagementModule } from './modules/lookup-management/lookup-management.module';
import { RawDownloadModule } from './modules/raw-download/raw-download.module';
import { UsersModule } from './modules/users/users.module';
import { SurveyModule } from './modules/survey/survey.module';
import { QaModule } from './modules/qa/qa.module';

import { CacheModule } from '@nestjs/cache-manager';
import Keyv from 'keyv';
import { createKeyv } from '@keyv/redis';
import { QaReconciliationModule } from './modules/qa-reconciliation/qa-reconciliation.module';
import { QaProductivityModule } from './modules/qa-productivity/qa-productivity.module';

@Module({
  imports: [
    // 1. Enable Scheduling
    ScheduleModule.forRoot(),

    // 2. Global Redis Cache (memanfaatkan REDIS_URL yang sudah ada)
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: () => {
        const redisUrl = process.env.REDIS_URL;
        if (redisUrl) {
          return {
            stores: [createKeyv(redisUrl)],
            ttl: 60_000, // default TTL 60 detik (dalam ms)
          };
        }
        // Fallback ke in-memory jika Redis tidak tersedia
        return {
          stores: [new Keyv()],
          ttl: 60_000,
        };
      },
    }),

    BullModule.forRoot({
      connection: process.env.REDIS_URL
        ? {
            url: process.env.REDIS_URL,
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
          }
        : {
            host: process.env.REDIS_HOST || 'localhost',
            port: Number(process.env.REDIS_PORT) || 6379,
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
            retryStrategy: (times: number) => {
              // Retry after increasing delays, up to 30 seconds
              return Math.min(times * 1000, 30000);
            },
          },
    }),
    HttpModule,
    AuthModule,
    PrismaModule,
    UploadModule,
    DashboardModule,
    SchedulerModule,
    IncidentModule,
    NewsModule,
    LookupManagementModule,
    RawDownloadModule,
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
      serveStaticOptions: {
        setHeaders: (res) => {
          // This tells the browser that this specific resource can be loaded by other origins
          res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        },
      },
    }),
    UsersModule,
    SurveyModule,
    QaModule,
    QaReconciliationModule,
    QaProductivityModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
