// ticket-scheduler.service.ts
import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
// import { InjectQueue } from '@nestjs/bullmq';
// import { Queue } from 'bullmq';
import { axiosPostWithRetry } from '../utils/axios-retry.util';
// moment-timezone (bukan 'moment') supaya .tz() selalu tersedia di file ini,
// tanpa bergantung pada file lain yang kebetulan sudah me-load-nya duluan.
import moment from 'moment-timezone';
import { PrismaService } from 'prisma/prisma.service';
import { DailyOcaTicketProcessor } from '../processor/daily-oca-ticket-processor';
import { OCA_AUTH, OCA_ENDPOINTS } from '../utils/oca-api.constant';

export type OcaSyncStatus = 'success' | 'partial' | 'failed' | 'skipped';

export interface OcaSyncResult {
  status: OcaSyncStatus;
  /** Jam selesai run, hanya diisi kalau lastSync benar-benar ikut diperbarui. */
  lastSync: string | null;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  pagesFetched: number;
  ticketsSeen: number;
  ticketsToProcess: number;
  chunksProcessed: number;
  chunksFailed: number;
  ticketsSaved: number;
  ticketsFailed: number;
  error: string | null;
  lastJob: string;
}

const DEFAULT_CRON = CronExpression.EVERY_30_MINUTES;

/**
 * Cron dari env divalidasi seadanya (jumlah field) supaya typo tidak bikin
 * aplikasi gagal boot — decorator @Cron dievaluasi saat file di-import.
 */
function resolveCronExpression(raw: string | undefined): string {
  const value = raw?.trim();
  if (!value) return DEFAULT_CRON;

  const fieldCount = value.split(/\s+/).length;
  if (fieldCount < 5 || fieldCount > 6) {
    new Logger('OcaTicketSchedulerService').warn(
      `CRON_SYNC_DAILY_OCA="${value}" tidak valid (${fieldCount} field, harus 5 atau 6). Memakai default "${DEFAULT_CRON}".`,
    );
    return DEFAULT_CRON;
  }
  return value;
}

@Injectable()
export class OcaTicketSchedulerService {
  private readonly logger = new Logger(OcaTicketSchedulerService.name);

  /** Mencegah run cron dan trigger manual saling tumpang tindih. */
  private isRunning = false;

  /** Hasil run terakhir di proses ini (hilang saat restart, murni untuk diagnosa). */
  private lastRun: OcaSyncResult | null = null;

  constructor(
    // @InjectQueue('ticket-processing') private ticketQueue: Queue,
    @Inject(forwardRef(() => DailyOcaTicketProcessor))
    private readonly processor: DailyOcaTicketProcessor,
    private readonly prisma: PrismaService,
  ) {}

  @Cron(resolveCronExpression(process.env.CRON_SYNC_DAILY_OCA), {
    name: 'sync-daily-oca',
    timeZone: 'Asia/Jakarta',
  })
  async handleScheduledSync() {
    if (process.env.OCA_SYNC_ENABLED === 'false') {
      this.logger.debug('Scheduled OCA sync dilewati (OCA_SYNC_ENABLED=false).');
      return;
    }
    await this.handleCron();
  }

  async handleCron(): Promise<OcaSyncResult> {
    const startedAt = new Date();

    if (this.isRunning) {
      this.logger.warn('Sync sebelumnya masih berjalan, run kali ini dilewati.');
      return this.buildResult({
        status: 'skipped',
        startedAt,
        error: 'Sync sebelumnya masih berjalan',
      });
    }

    this.isRunning = true;
    this.logger.log('Starting ticket sync...');

    // 1. Determine Date Range (e.g., fetch last 24 hours to catch updates)
    const todayDate = moment().tz('Asia/Jakarta').format('YYYY-MM-DD');

    let page = 1;
    let hasMore = true;
    let lastJob = '';

    let pagesFetched = 0;
    let ticketsSeen = 0;
    let ticketsToProcessTotal = 0;
    let chunksProcessed = 0;
    let chunksFailed = 0;
    let ticketsSaved = 0;
    let ticketsFailed = 0;
    let fetchError: string | null = null;

    try {
      while (hasMore) {
        try {
          // 2. Hit the List API
          const response = await axiosPostWithRetry(
            OCA_ENDPOINTS.getList,
            {
              agent_id: '621464b818b240212019132c',
              application: '621463e262b3c500214ab937',
              filterOptions: [
                {
                  key: 'range_date',
                  values: { start_date: todayDate, end_date: todayDate },
                },
              ],
              limit: 100, // Decrease limit to 100 to avoid timeouts/ECONNRESET
              page: page,
              search: {
                key: '',
                value: '',
              },
              sort: { created: -1 },
            },
            // Samakan dengan list-activity: endpoint OCA di belakang gateway
            // yang sama dan menolak request tanpa basic auth.
            { auth: OCA_AUTH },
          );

          const results = response.data?.results;
          const tickets = Array.isArray(results?.data) ? results.data : null;

          if (tickets === null) {
            fetchError = `Bentuk respons tidak dikenali pada page ${page}: ${this.snippet(response.data)}`;
            this.logger.error(`Failed to fetch OCA list API: ${fetchError}`);
            hasMore = false;
            break;
          }

          pagesFetched++;
          ticketsSeen += tickets.length;

          // Log eksplisit supaya "API error" vs "tiket memang kosong" bisa
          // dibedakan langsung dari log, tanpa perlu tebak-tebakan.
          this.logger.log(
            `syncing ticket for date ${todayDate} — page ${page}/${results?.pages ?? '?'}, ` +
              `HTTP ${response.status}, ${tickets.length} tiket diterima (total API: ${results?.total ?? '?'})`,
          );

          if (tickets.length === 0) {
            hasMore = false;
            break;
          }

          const ticketNumbers = tickets.map((t) => t.ticket_number);

          const dbRows = await this.prisma.$queryRaw<
            { ticket_number: string; last_update: Date | null }[]
          >`
        SELECT "ticket_number", "last_update"
        FROM "RawOca"
        WHERE "ticket_number" = ANY(${ticketNumbers});
`;
          const dbMap = new Map(
            dbRows.map((r) => [r.ticket_number, r.last_update?.getTime()]),
          );

          const ticketsToProcess = tickets.filter((t) => {
            const dbLast = dbMap.get(t.ticket_number);
            if (!dbLast) return true; // new ticket
            return new Date(t.updated_at).getTime() > dbLast;
          });

          ticketsToProcessTotal += ticketsToProcess.length;
          this.logger.log(
            `Page ${page}: ${ticketsToProcess.length} dari ${tickets.length} tiket perlu diproses (sisanya sudah up-to-date).`,
          );

          // 3. Process in chunks
          if (ticketsToProcess.length > 0) {
            const batchChunkSize = 10;
            for (let i = 0; i < ticketsToProcess.length; i += batchChunkSize) {
              const chunk = ticketsToProcess.slice(i, i + batchChunkSize);
              const chunkId = `batch-${page}-${chunk[0].ticket_id}-${moment().unix()}`;

              // Process synchronously without BullMQ
              try {
                const summary = await this.processor.processTickets(chunk);
                chunksProcessed++;
                ticketsSaved += summary?.saved ?? 0;
                ticketsFailed += summary?.failed ?? 0;
                this.logger.log(
                  `Processed batch page ${page} (chunk ${i / batchChunkSize + 1}) with ${chunk.length} tickets ` +
                    `(saved=${summary?.saved ?? '?'} failed=${summary?.failed ?? '?'}), jobId: ${chunkId}`,
                );
                lastJob = chunkId;
              } catch (processErr: any) {
                chunksFailed++;
                this.logger.error(
                  `Failed to process chunk ${chunkId}: ${this.describeError(processErr)}`,
                );
              }
            }
          }

          // Pagination Logic
          if (page >= (results?.pages ?? page)) {
            hasMore = false;
          } else {
            page++;
          }
        } catch (err: any) {
          fetchError = this.describeError(err);
          this.logger.error(
            `Failed to fetch OCA list API (page ${page}): ${fetchError}`,
          );
          hasMore = false; // Stop loop gracefully on error
        }
      }

      // 4. Tentukan status akhir
      const status: OcaSyncStatus = fetchError
        ? pagesFetched > 0
          ? 'partial'
          : 'failed'
        : chunksFailed > 0 || ticketsFailed > 0
          ? 'partial'
          : 'success';

      // lastSync HANYA diperbarui saat run benar-benar bersih, supaya angka di
      // dashboard tidak berbohong ketika API OCA gagal di page pertama.
      let lastSyncApplied: Date | null = null;
      if (status === 'success') {
        const now = new Date();
        try {
          await this.prisma.ocaDailySync.upsert({
            where: { id: 1 }, // Always keep one row
            update: { lastSync: now },
            create: { id: 1, lastSync: now },
          });
          lastSyncApplied = now;
        } catch (err: any) {
          this.logger.error(
            `Failed to update last sync time: ${this.describeError(err)}`,
          );
        }
      } else {
        this.logger.warn(
          `Sync selesai dengan status "${status}" — lastSync sengaja TIDAK diperbarui. ` +
            `pages=${pagesFetched} tiket=${ticketsSeen} tersimpan=${ticketsSaved} ` +
            `tiketGagal=${ticketsFailed} chunkGagal=${chunksFailed} error=${fetchError ?? '-'}`,
        );
      }

      const result = this.buildResult({
        status,
        startedAt,
        lastSync: lastSyncApplied
          ? moment(lastSyncApplied).tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
          : null,
        pagesFetched,
        ticketsSeen,
        ticketsToProcess: ticketsToProcessTotal,
        chunksProcessed,
        chunksFailed,
        ticketsSaved,
        ticketsFailed,
        error: fetchError,
        lastJob,
      });

      this.logger.log(
        `Ticket sync process completed — status=${status} durasi=${result.durationMs}ms ` +
          `pages=${pagesFetched} tiket=${ticketsSeen} diproses=${ticketsToProcessTotal} ` +
          `tersimpan=${ticketsSaved} tiketGagal=${ticketsFailed} chunkGagal=${chunksFailed}`,
      );

      return result;
    } finally {
      this.isRunning = false;
    }
  }

  async getLastSyncTime() {
    const record = await this.prisma.ocaDailySync.findUnique({
      where: { id: 1 },
    });
    return record?.lastSync ?? null;
  }

  /** Status run terakhir di proses ini — untuk diagnosa lewat API, bukan log saja. */
  getLastRunStatus(): (OcaSyncResult & { isRunning: boolean }) | { isRunning: boolean; status: 'never-run' } {
    if (!this.lastRun) {
      return { isRunning: this.isRunning, status: 'never-run' };
    }
    return { ...this.lastRun, isRunning: this.isRunning };
  }

  private buildResult(
    partial: Omit<Partial<OcaSyncResult>, 'startedAt' | 'status'> & {
      status: OcaSyncStatus;
      startedAt: Date;
    },
  ): OcaSyncResult {
    const finishedAt = new Date();
    const result: OcaSyncResult = {
      status: partial.status,
      lastSync: partial.lastSync ?? null,
      startedAt: moment(partial.startedAt).tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss'),
      finishedAt: moment(finishedAt).tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss'),
      durationMs: finishedAt.getTime() - partial.startedAt.getTime(),
      pagesFetched: partial.pagesFetched ?? 0,
      ticketsSeen: partial.ticketsSeen ?? 0,
      ticketsToProcess: partial.ticketsToProcess ?? 0,
      chunksProcessed: partial.chunksProcessed ?? 0,
      chunksFailed: partial.chunksFailed ?? 0,
      ticketsSaved: partial.ticketsSaved ?? 0,
      ticketsFailed: partial.ticketsFailed ?? 0,
      error: partial.error ?? null,
      lastJob: partial.lastJob ?? '',
    };

    // Run yang dilewati tidak boleh menimpa hasil diagnosa run sebelumnya.
    if (result.status !== 'skipped') {
      this.lastRun = result;
    }
    return result;
  }

  /** Error axios tanpa detail HTTP praktis tidak bisa didiagnosa dari log. */
  private describeError(err: any): string {
    const parts: string[] = [];
    if (err?.code) parts.push(`code=${err.code}`);
    if (err?.response?.status) parts.push(`status=${err.response.status}`);
    parts.push(`message=${err?.message ?? String(err)}`);
    if (err?.response?.data) parts.push(`body=${this.snippet(err.response.data)}`);
    return parts.join(' | ');
  }

  private snippet(data: unknown, max = 300): string {
    try {
      const text = typeof data === 'string' ? data : JSON.stringify(data);
      if (!text) return '<kosong>';
      return text.length > max ? `${text.slice(0, max)}…` : text;
    } catch {
      return '<tidak bisa diserialisasi>';
    }
  }
}
