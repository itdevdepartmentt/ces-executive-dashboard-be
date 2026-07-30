import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Get,
  Param,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { InMemoryQueueService } from './in-memory-queue.service';

@Controller('upload')
export class UploadController {
  constructor(private readonly queueService: InMemoryQueueService) {}

  @Post('csat-report')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({ destination: './uploads' }), // Save temp file
    }),
  )
  async uploadExcel(@UploadedFile() file: Express.Multer.File) {
    // 1. Send job to the queue immediately
    const job = await this.queueService.addJob('process-csat-report', {
      path: file.path,
      filename: file.originalname,
    });

    // 2. Return success immediately (User doesn't wait)
    return {
      message: 'File CSAT report received. Processing started.',
      jobId: job.id,
    };
  }

  @Post('omnix-report')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({ destination: './uploads' }), // Save temp file
    }),
  )
  async uploadOmnixReport(@UploadedFile() file: Express.Multer.File) {
    // 1. Send job to the queue immediately
    const job = await this.queueService.addJob('process-omnix-report', {
      path: file.path,
      filename: file.originalname,
    });

    // 2. Return success immediately (User doesn't wait)
    return {
      message: 'File Omnix report received. Processing started.',
      jobId: job.id,
    };
  }

  @Post('call-report')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({ destination: './uploads' }), // Save temp file
    }),
  )
  async uploadCallReport(@UploadedFile() file: Express.Multer.File) {
    // 1. Send job to the queue immediately
    const job = await this.queueService.addJob('process-call-report', {
      path: file.path,
      filename: file.originalname,
    });

    // 2. Return success immediately (User doesn't wait)
    return {
      message: 'File Call report received. Processing started.',
      jobId: job.id,
      filename: file.filename,
    };
  }

  @Post('avaya-report')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({ destination: './uploads' }), // Save temp file
    }),
  )
  async uploadAvayaReport(@UploadedFile() file: Express.Multer.File) {
    // 1. Send job to the queue immediately
    const job = await this.queueService.addJob('process-avaya-report', {
      path: file.path,
      filename: file.originalname,
    });

    // 2. Return success immediately (User doesn't wait)
    return {
      message: 'File Call report received. Processing started.',
      jobId: job.id,
      filename: file.filename,
    };
  }

  @Post('oca-report')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({ destination: './uploads' }), // Save temp file
    }),
  )
  async uploadOcaReport(@UploadedFile() file: Express.Multer.File) {
    // 1. Send job to the queue immediately
    const job = await this.queueService.addJob('process-oca-report', {
      path: file.path,
      filename: file.originalname,
    });

    // 2. Return success immediately (User doesn't wait)
    return {
      message: 'File OCA report received. Processing started.',
      jobId: job.id,
    };
  }

  @Get('status/:jobId')
  async getJobStatus(@Param('jobId') jobId: string) {
    // Our in-memory service automatically returns the correct format: 
    // { status: 'completed' | 'active' | 'failed', result: ..., progress: ... }
    return this.queueService.getJobStatus(jobId);
  }
}
