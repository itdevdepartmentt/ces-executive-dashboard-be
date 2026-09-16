import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Get,
  Param,
  NotFoundException,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { diskStorage } from 'multer';
import { OcaReportSchedulerService } from 'src/worker/scheduler/oca-report-scheduler.service';
import moment from 'moment-timezone';
import { OcaTicketSchedulerService } from 'src/worker/scheduler/oca-ticket-scheduler.service';

@Controller('schedule')
export class ScheduleController {
  constructor(
    // @InjectQueue('ticket-processing') private scheduleQueue: Queue,
    private readonly ocaReportService: OcaReportSchedulerService,
    private readonly ocaTicketSchedulerService: OcaTicketSchedulerService,
  ) {}

  /**
   * Dipakai halaman dashboard untuk memantau tombol sync harian.
   *
   * Sebelumnya mengembalikan 'completed' secara hardcoded, sehingga sync yang
   * gagal 503 pun tetap memunculkan toast hijau "Sync Complete" di UI. Sekarang
   * memantulkan hasil run yang sebenarnya. Bentuk responsnya sengaja dijaga
   * ('active' | 'completed' | 'failed' + error) supaya frontend tidak perlu
   * diubah — dia sudah menangani ketiganya.
   */
  @Get('status/:jobId')
  getJobStatus(@Param('jobId') _jobId: string) {
    const run = this.ocaTicketSchedulerService.getLastRunStatus();

    if (run.isRunning) {
      return { status: 'active', progress: 0 };
    }

    if (run.status === 'never-run') {
      return {
        status: 'failed',
        error:
          'Tidak ada hasil sync yang tercatat. Backend kemungkinan restart saat sync berjalan.',
      };
    }

    if (run.status === 'success' || run.status === 'fallback') {
      return {
        status: 'completed',
        progress: 100,
        result: {
          // 'report' menandakan get-list gagal dan data diambil lewat CSV.
          via: run.status === 'fallback' ? 'report' : 'get-list',
          ticketsSeen: run.ticketsSeen,
          ticketsSaved: run.ticketsSaved,
          finishedAt: run.finishedAt,
        },
      };
    }

    if (run.status === 'partial') {
      // Sebagian data hilang. Ditandai gagal supaya tidak lolos diam-diam.
      return {
        status: 'failed',
        error:
          `Sync selesai sebagian: ${run.ticketsSaved} tiket tersimpan, ` +
          `${run.ticketsFailed} tiket gagal, ${run.chunksFailed} batch gagal.` +
          (run.error ? ` ${run.error}` : ''),
      };
    }

    const pesan = [run.error ?? 'Sync gagal tanpa detail.'];
    if (run.fallbackSkippedReason) {
      pesan.push(`Fallback report dilewati: ${run.fallbackSkippedReason}.`);
    }
    if (run.fallbackError) {
      pesan.push(`Fallback report gagal: ${run.fallbackError}.`);
    }
    return { status: 'failed', error: pesan.join(' ') };
  }

  @Post('trigger-oca-sync')
  async triggerSync(
    @Body('startDate') startDate?: string,
    @Body('endDate') endDate?: string,
  ) {
    // 1. Validation: Ensure dates are provided or use defaults
    const start =
      startDate ||
      moment().tz('Asia/Jakarta').subtract(8, 'days').format('YYYY-MM-DD');
    const end =
      endDate ||
      moment().tz('Asia/Jakarta').subtract(1, 'days').format('YYYY-MM-DD');

    // 2. Format validation (YYYY-MM-DD)
    if (
      !moment(start, 'YYYY-MM-DD', true).isValid() ||
      !moment(end, 'YYYY-MM-DD', true).isValid()
    ) {
      throw new BadRequestException('Invalid date format. Use YYYY-MM-DD');
    }

    // 3. Trigger the process (Note: This will wait for the polling to finish)
    // If you want the API to return immediately, remove the 'await'
    const result = await this.ocaReportService.processOcaReport(start, end);

    return {
      message: 'Manual OCA Sync started and queued.',
      ...result,
    };
  }

  @Post('sync-daily-oca')
  async syncDailyOca() {
    // Run in background without awaiting to prevent timeout.
    // Hasilnya tidak bisa ditunggu di sini, jadi respons ini HANYA berarti
    // "sync dimulai" — bukan "sync berhasil". Cek GET /schedule/sync-status
    // untuk hasil sebenarnya.
    this.ocaTicketSchedulerService.handleCron({ force: true }).catch((e) => {
      console.error('Background sync error:', e);
    });

    const lastSyncUtc = await this.ocaTicketSchedulerService.getLastSyncTime();
    const lastSync = lastSyncUtc
      ? moment(lastSyncUtc).tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
      : null;

    return {
      message:
        'Sync dimulai di background. Cek /schedule/sync-status untuk hasilnya.',
      jobId: 'background-sync',
      lastSync: lastSync,
    };
  }

  @Get('last-sync')
  async getLastSync() {
    const lastSyncUtc = await this.ocaTicketSchedulerService.getLastSyncTime();
    const lastSyncWib = lastSyncUtc
      ? moment(lastSyncUtc).tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
      : null;

    // lastSyncWib dipertahankan apa adanya untuk kompatibilitas frontend.
    // Sejak perbaikan, nilainya hanya diperbarui saat sync benar-benar bersih,
    // jadi sekarang bisa dipercaya sebagai penanda keberhasilan.
    return {
      lastSyncWib,
      lastRun: this.ocaTicketSchedulerService.getLastRunStatus(),
    };
  }

  /** Diagnosa: hasil run sync terakhir di proses ini, termasuk pesan error. */
  @Get('sync-status')
  getSyncStatus() {
    return this.ocaTicketSchedulerService.getLastRunStatus();
  }
}
