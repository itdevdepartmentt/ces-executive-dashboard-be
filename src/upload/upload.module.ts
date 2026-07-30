// src/excel/excel.module.ts
import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { PrismaService } from '../../prisma/prisma.service'; // Assuming you have this
import { ExcelModule } from 'src/worker/excel.module';
import { InMemoryQueueService } from './in-memory-queue.service';

@Module({
  imports: [
    ExcelModule,
  ],
  controllers: [UploadController],
  providers: [PrismaService, InMemoryQueueService],
})
export class UploadModule {}
