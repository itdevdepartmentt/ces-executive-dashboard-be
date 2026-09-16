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
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { diskStorage } from 'multer';
import { InMemoryQueueService } from './in-memory-queue.service';

@Controller('upload')
export class UploadController {
  constructor(
    private readonly queueService: InMemoryQueueService,
    @InjectQueue('excel-queue') private readonly excelQueue: Queue,
  ) {}

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
    // Upload lewat controller ini masuk ke antrean in-memory (id berupa string
    // acak). Tapi /schedule/trigger-oca-sync menaruh job-nya di BullMQ
    // 'excel-queue' (id numerik) dan frontend memakai endpoint yang sama untuk
    // memantau keduanya. Tanpa fallback, job BullMQ selalu balas 404 dan
    // statusnya tersangkut 'active' selamanya di UI.
    try {
      return this.queueService.getJobStatus(jobId);
    } catch (err) {
      if (!(err instanceof NotFoundException)) throw err;
      return this.getBullJobStatus(jobId);
    }
  }

  /** Bentuk responsnya disamakan dengan InMemoryQueueService agar frontend tidak perlu tahu bedanya. */
  private async getBullJobStatus(jobId: string) {
    const job = await this.excelQueue.getJob(jobId);
    if (!job) {
      throw new NotFoundException(`Job ${jobId} not found`);
    }

    const state = await job.getState();
    if (state === 'completed') {
      return { status: 'completed', result: job.returnvalue ?? null };
    }
    if (state === 'failed') {
      return {
        status: 'failed',
        error: job.failedReason || 'Unknown processing error',
      };
    }

    // waiting / active / delayed / paused -> frontend menampilkannya sebagai berjalan
    return {
      status: 'active',
      progress: typeof job.progress === 'number' ? job.progress : 0,
    };
  }
}
