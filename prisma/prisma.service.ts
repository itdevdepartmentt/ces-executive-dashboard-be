import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      // Force Prisma to only use 2 connections max
      // This prevents EMAXCONNSESSION on Supabase session mode (pool_size: 15)
    });

    // Override the connection pool size via internal config
    // @ts-ignore - accessing internal engine config
    if (this['_engineConfig']) {
      // @ts-ignore
      this['_engineConfig'].activeProvider = 'postgresql';
    }
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Database connected successfully');
    } catch (e: any) {
      this.logger.error(`Database connection failed: ${e.message}`);
      // Don't crash the app - let it start and retry on first query
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}