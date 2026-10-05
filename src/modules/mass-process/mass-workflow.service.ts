import { Injectable } from '@nestjs/common';
import { MassTicket } from '@prisma/client';
import {
  CONFIRMATION_DEFS,
  STATUS_DONE,
  STATUS_IN_PROGRESS,
  STATUS_NOK,
  STATUS_OK,
  ageingBucket,
} from './mass-process.constants';

export interface ProcessStep {
  name: string;
  status?: string;
  notes?: string;
  orderId?: string;
}

export interface Confirmation {
  status?: string;
  notes?: string;
}

export interface WorkflowResult {
  validationStatus: string | null;
  currentProcess: string;
  overallStatus: string;
  processProgress: number;
  daysOpen: number;
  ageingBucket: string;
  bottleneck: string | null;
  bottleneckSince: Date | null;
  lastAction: string;
  lastActionBy: string;
  lastStatus?: string;
  completionDate?: Date;
}

/**
 * Perhitungan status tiket Mass Process.
 *
 * Dipisahkan dari service database agar logikanya murni dan bisa diuji tanpa
 * Postgres — ini bagian yang paling mudah salah dan paling sering berubah.
 */
@Injectable()
export class MassWorkflowService {
  calculate(ticket: MassTicket, now: Date = new Date()): WorkflowResult {
    const steps = this.readSteps(ticket.processSteps);
    const confirmations = this.readConfirmations(ticket.confirmations);

    const pic = (ticket.validationPicStatus ?? '').trim();
    const pks = (ticket.validationPksStatus ?? '').trim();
    const nodin = (ticket.validationNodinStatus ?? '').trim();

    // NODIN opsional: kosong dianggap lolos. PIC dan PKS wajib OK.
    const validationComplete =
      pic === STATUS_OK && pks === STATUS_OK && (nodin === '' || nodin === STATUS_OK);
    const validationNok =
      pic === STATUS_NOK ||
      pks === STATUS_NOK ||
      nodin === STATUS_NOK ||
      (ticket.validationStatus ?? '').trim() === STATUS_NOK;

    const profilingStatus = (ticket.profilingStatus ?? '').trim();
    const profilingDone = profilingStatus === STATUS_DONE;
    const profilingStarted = profilingStatus === STATUS_IN_PROGRESS || profilingDone;

    const doneSteps = steps.filter((s) => (s.status ?? '') === STATUS_DONE).length;
    const totalSteps = steps.length;

    let currentProcess = 'Validation';
    let overallStatus = 'Not Started';
    let progress = 0;

    if (validationNok) {
      currentProcess = 'Validation';
      overallStatus = STATUS_IN_PROGRESS;
      progress = 0;
    } else if (!validationComplete) {
      currentProcess = 'Validation';
      overallStatus = [pic, pks, nodin].some((v) => v) ? STATUS_IN_PROGRESS : 'Not Started';
      progress = 0;
    } else {
      progress = 33;
      if (!profilingStarted) {
        currentProcess = 'Profiling Preparation';
        overallStatus = 'Not Started';
      } else if (!profilingDone) {
        currentProcess = 'Profiling Preparation';
        overallStatus = STATUS_IN_PROGRESS;
      } else {
        progress = 67;
        if (totalSteps > 0) {
          const stepProgress = Math.round((doneSteps / totalSteps) * 100);
          progress = 67 + Math.round(stepProgress * 0.33);
          const next = steps.find((s) => (s.status ?? '') !== STATUS_DONE);
          if (next) {
            currentProcess = (next.name ?? '').trim() || 'Process Steps';
            overallStatus = STATUS_IN_PROGRESS;
          } else {
            currentProcess = 'Completed';
            overallStatus = 'Completed';
            progress = 100;
          }
        } else {
          // Profiling selesai tapi langkah prosesnya belum didefinisikan.
          currentProcess = 'Process Steps';
          overallStatus = STATUS_IN_PROGRESS;
        }
      }
    }

    const created = ticket.ticketCreated ?? ticket.uploadedAt ?? null;
    const daysOpen = created
      ? Math.max(0, Math.floor((now.getTime() - new Date(created).getTime()) / 86400000))
      : 0;

    const bottleneck = this.detectBottleneck(validationNok, confirmations);

    const result: WorkflowResult = {
      validationStatus: validationNok ? STATUS_NOK : validationComplete ? STATUS_OK : null,
      currentProcess,
      overallStatus,
      processProgress: progress,
      daysOpen,
      ageingBucket: ageingBucket(daysOpen),
      bottleneck: bottleneck,
      bottleneckSince: bottleneck
        ? (ticket.bottleneck === bottleneck ? ticket.bottleneckSince : now)
        : null,
      lastAction: currentProcess,
      lastActionBy: ticket.agent ?? '',
    };

    if (overallStatus === 'Completed') {
      result.lastStatus = 'Closed';
      result.completionDate = ticket.completionDate ?? now;
    }

    return result;
  }

  /**
   * Bottleneck pertama yang ditemukan, mengikuti urutan prioritas di
   * CONFIRMATION_DEFS. Validation NOK selalu menang karena memblokir semua.
   */
  private detectBottleneck(
    validationNok: boolean,
    confirmations: Record<string, Confirmation>,
  ): string | null {
    if (validationNok) return 'Validation NOK';

    for (const def of CONFIRMATION_DEFS) {
      const entry = confirmations[def.key];
      if ((entry?.status ?? '') === STATUS_IN_PROGRESS) {
        return def.label;
      }
    }
    return null;
  }

  readSteps(raw: unknown): ProcessStep[] {
    const parsed = this.parseJson(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((s): s is ProcessStep => typeof s === 'object' && s !== null)
      .filter((s) => String(s.name ?? '').trim())
      .map((s) => ({
        name: String(s.name).trim(),
        status: s.status ? String(s.status) : '',
        notes: s.notes ? String(s.notes) : '',
        orderId: s.orderId ? String(s.orderId) : '',
      }));
  }

  readConfirmations(raw: unknown): Record<string, Confirmation> {
    const parsed = this.parseJson(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as Record<string, Confirmation>;
  }

  private parseJson(raw: unknown): unknown {
    if (raw == null) return null;
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }
    return raw;
  }
}
