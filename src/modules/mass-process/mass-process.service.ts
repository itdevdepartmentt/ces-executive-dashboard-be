import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { MassTicket, Prisma } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import {
  CreateProcessStepDto,
  CreateStaffDto,
  MarkWorkedDto,
  QueryTicketsDto,
  SaveRecapDto,
  UpdateAgentDto,
  UpdateProcessStepDto,
  UpdateStaffDto,
  UploadTicketsDto,
} from './dto/mass-process.dto';
import { MassWorkflowService } from './mass-workflow.service';

@Injectable()
export class MassProcessService {
  private readonly logger = new Logger(MassProcessService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly workflow: MassWorkflowService,
  ) {}

  // ------------------------------------------------------------------ upload

  /**
   * Upload daftar tiket. Tiket yang sudah ada hanya diperbarui atribut
   * dasarnya — status alur kerja, penugasan agent, dan catatan tidak
   * disentuh, karena itu hasil kerja tim dan bukan milik file Excel.
   */
  async uploadTickets(dto: UploadTicketsDto) {
    const summary = { created: 0, updated: 0, skipped: [] as string[] };

    for (const row of dto.rows) {
      const ticketNumber = String(row.ticketNumber ?? '').trim();
      if (!ticketNumber) {
        summary.skipped.push('(nomor tiket kosong)');
        continue;
      }

      // Hanya kolom yang benar-benar ada di baris yang ditulis. Kalau seluruh
      // field dipetakan tanpa syarat, file Excel yang kekurangan satu kolom
      // akan menghapus data yang sudah tersimpan.
      const base: Prisma.MassTicketUpdateInput = {};
      const put = (key: keyof Prisma.MassTicketUpdateInput, value: unknown) => {
        if (value !== undefined) (base as Record<string, unknown>)[key] = value;
      };

      put('ticketSubject', this.optionalText(row.ticketSubject));
      put('lastStatus', this.optionalText(row.lastStatus));
      put('detailCategory', this.optionalText(row.detailCategory));
      put('subCategory', this.optionalText(row.subCategory));
      put('category', this.optionalText(row.category));
      put('namaPerusahaan', this.optionalText(row.namaPerusahaan));
      put('projectId', this.optionalText(row.projectId));
      if (row.ticketCreated !== undefined) {
        put('ticketCreated', this.parseDate(row.ticketCreated));
      }
      if (row.jumlahMsisdn !== undefined) {
        put('jumlahMsisdn', this.parseInt(row.jumlahMsisdn));
      }

      const existing = await this.prisma.massTicket.findUnique({
        where: { ticketNumber },
      });

      if (existing) {
        // Tiket yang sudah Closed di sistem internal tidak ditimpa status
        // barunya dari Excel, supaya penyelesaian tidak terbuka kembali.
        const keepStatus = existing.overallStatus === 'Completed';
        await this.prisma.massTicket.update({
          where: { ticketNumber },
          data: keepStatus ? { ...base, lastStatus: existing.lastStatus } : base,
        });

        summary.updated++;
      } else {
        await this.prisma.massTicket.create({
          data: { ...(base as Prisma.MassTicketCreateInput), ticketNumber },
        });
        summary.created++;
      }

      await this.recalculate(ticketNumber);
    }

    this.logger.log(
      `Upload selesai: ${summary.created} baru, ${summary.updated} diperbarui, ${summary.skipped.length} dilewati.`,
    );
    return summary;
  }

  // ------------------------------------------------------------------- baca

  async listTickets(query: QueryTicketsDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(query.limit) || 25));

    const where: Prisma.MassTicketWhereInput = {};
    if (query.agent) where.agent = query.agent;
    if (query.teamLeader) where.teamLeader = query.teamLeader;
    if (query.overallStatus) where.overallStatus = query.overallStatus;
    if (query.ageingBucket) where.ageingBucket = query.ageingBucket;
    if (query.bottleneck) where.bottleneck = query.bottleneck;
    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { ticketNumber: { contains: term, mode: 'insensitive' } },
        { namaPerusahaan: { contains: term, mode: 'insensitive' } },
        { projectId: { contains: term, mode: 'insensitive' } },
        { ticketSubject: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.massTicket.count({ where }),
      this.prisma.massTicket.findMany({
        where,
        orderBy: [{ ticketCreated: 'desc' }, { ticketNumber: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data,
      meta: { total, page, limit, lastPage: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  async getTicket(ticketNumber: string) {
    const ticket = await this.prisma.massTicket.findUnique({
      where: { ticketNumber },
      include: {
        histories: { orderBy: { createdAt: 'desc' }, take: 50 },
        assignmentLogs: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    });
    if (!ticket) {
      throw new NotFoundException(`Tiket ${ticketNumber} tidak ditemukan`);
    }
    return ticket;
  }

  // ------------------------------------------------------------------ simpan

  async saveRecap(ticketNumber: string, dto: SaveRecapDto, actor?: string) {
    const before = await this.requireTicket(ticketNumber);

    const data: Prisma.MassTicketUpdateInput = {};
    const assign = <K extends keyof SaveRecapDto>(key: K, target: string) => {
      if (dto[key] !== undefined) {
        (data as Record<string, unknown>)[target] = dto[key];
      }
    };

    assign('teamLeader', 'teamLeader');
    assign('waktuPengerjaanKhusus', 'waktuPengerjaanKhusus');
    assign('validationPicStatus', 'validationPicStatus');
    assign('validationPicNotes', 'validationPicNotes');
    assign('validationPksStatus', 'validationPksStatus');
    assign('validationPksNotes', 'validationPksNotes');
    assign('validationNodinStatus', 'validationNodinStatus');
    assign('validationNodinNotes', 'validationNodinNotes');
    assign('profilingStatus', 'profilingStatus');
    assign('profilingOrderId', 'profilingOrderId');
    assign('profilingNotes', 'profilingNotes');

    if (dto.processSteps !== undefined) {
      data.processSteps = dto.processSteps as unknown as Prisma.InputJsonValue;
    }
    if (dto.confirmations !== undefined) {
      data.confirmations = dto.confirmations as Prisma.InputJsonValue;
    }
    if (dto.customValues !== undefined) {
      data.customValues = dto.customValues as Prisma.InputJsonValue;
    }

    // Perubahan agent punya jalurnya sendiri agar riwayatnya tercatat.
    if (dto.agent !== undefined && dto.agent !== before.agent) {
      await this.updateAgent(
        ticketNumber,
        { newAgent: dto.agent, newTeamLeader: dto.teamLeader },
        actor,
      );
    }

    await this.prisma.massTicket.update({ where: { ticketNumber }, data });
    const after = await this.recalculate(ticketNumber);

    await this.writeHistoryForChanges(before, after, actor, dto.notes);
    await this.markWorkedToday(after, dto.notes);

    return after;
  }

  async updateAgent(ticketNumber: string, dto: UpdateAgentDto, actor?: string) {
    const ticket = await this.requireTicket(ticketNumber);
    const newAgent = dto.newAgent.trim();

    if (newAgent === (ticket.agent ?? '')) return ticket;

    const now = new Date();
    // Penugasan pertama (dari kosong) bukan "perubahan agent" — kalau ikut
    // dihitung, laporan rotasi agent akan selalu melebih-lebihkan satu.
    const isReassignment = Boolean((ticket.agent ?? '').trim());

    await this.prisma.$transaction([
      this.prisma.massTicket.update({
        where: { ticketNumber },
        data: {
          agent: newAgent,
          teamLeader: dto.newTeamLeader ?? ticket.teamLeader,
          agentAssignedAt: now,
          ...(isReassignment ? { agentChangeCount: { increment: 1 } } : {}),
        },
      }),
      this.prisma.massAssignmentHistory.create({
        data: {
          ticketId: ticket.id,
          ticketNumber,
          previousAgent: ticket.agent ?? '',
          newAgent,
          previousTeamLeader: ticket.teamLeader ?? '',
          newTeamLeader: dto.newTeamLeader ?? ticket.teamLeader ?? '',
          changedBy: actor ?? null,
          reason: dto.reason ?? null,
          notes: dto.notes ?? null,
        },
      }),
    ]);

    const updated = await this.requireTicket(ticketNumber);
    await this.createDailyAssignment(updated, now);
    return updated;
  }

  /** Hitung ulang kolom turunan dari kondisi tiket saat ini. */
  async recalculate(ticketNumber: string): Promise<MassTicket> {
    const ticket = await this.requireTicket(ticketNumber);
    const result = this.workflow.calculate(ticket);

    return this.prisma.massTicket.update({
      where: { ticketNumber },
      data: {
        validationStatus: result.validationStatus,
        currentProcess: result.currentProcess,
        overallStatus: result.overallStatus,
        processProgress: result.processProgress,
        daysOpen: result.daysOpen,
        ageingBucket: result.ageingBucket,
        bottleneck: result.bottleneck,
        bottleneckSince: result.bottleneckSince,
        idKoordinasiSummary: result.idKoordinasiSummary,
        todoSummary: result.todoSummary,
        lastAction: result.lastAction,
        lastActionBy: result.lastActionBy,
        ...(result.lastStatus ? { lastStatus: result.lastStatus } : {}),
        ...(result.completionDate ? { completionDate: result.completionDate } : {}),
      },
    });
  }

  /** Dipakai penjadwal atau tombol manual: perbarui umur semua tiket terbuka. */
  async recalculateAllOpen() {
    const open = await this.prisma.massTicket.findMany({
      where: { NOT: { overallStatus: 'Completed' } },
      select: { ticketNumber: true },
    });
    for (const t of open) await this.recalculate(t.ticketNumber);
    return { recalculated: open.length };
  }

  // -------------------------------------------------------- aktivitas harian

  private async createDailyAssignment(ticket: MassTicket, at: Date) {
    const activityDate = this.dateOnly(at);
    await this.prisma.massDailyActivity.upsert({
      where: {
        activityDate_ticketId_agent: {
          activityDate,
          ticketId: ticket.id,
          agent: ticket.agent ?? '',
        },
      },
      create: {
        activityDate,
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        agent: ticket.agent ?? '',
        assignedAt: at,
      },
      update: { assignedAt: at },
    });
  }

  private async markWorkedToday(ticket: MassTicket, notes?: string) {
    const now = new Date();
    const activityDate = this.dateOnly(now);
    await this.prisma.massDailyActivity.upsert({
      where: {
        activityDate_ticketId_agent: {
          activityDate,
          ticketId: ticket.id,
          agent: ticket.agent ?? '',
        },
      },
      create: {
        activityDate,
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        agent: ticket.agent ?? '',
        workedAt: now,
        notes: notes ?? null,
      },
      update: { workedAt: now, ...(notes ? { notes } : {}) },
    });
  }

  async getDailyActivity(date?: string) {
    const activityDate = this.dateOnly(date ? new Date(date) : new Date());
    return this.prisma.massDailyActivity.findMany({
      where: { activityDate },
      orderBy: [{ agent: 'asc' }, { ticketNumber: 'asc' }],
    });
  }

  async markWorked(ticketNumber: string, dto: MarkWorkedDto) {
    const ticket = await this.requireTicket(ticketNumber);
    await this.markWorkedToday(ticket, dto.notes);
    return { ok: true };
  }

  // --------------------------------------------------------------- dashboard

  /** Status dari OCA bervariasi penulisannya, jadi dikelompokkan lewat pola. */
  private readonly CLOSED_PATTERN =
    /closed|close|resolved|resolve|solved|completed|complete|cancelled|canceled/i;

  async getDashboard() {
    const [
      total,
      byStatus,
      byAgeing,
      byBottleneck,
      byProcess,
      completedToday,
      byLastStatus,
    ] = await Promise.all([
        this.prisma.massTicket.count(),
        this.prisma.massTicket.groupBy({
          by: ['overallStatus'],
          _count: { _all: true },
        }),
        this.prisma.massTicket.groupBy({
          by: ['ageingBucket'],
          _count: { _all: true },
        }),
        this.prisma.massTicket.groupBy({
          by: ['bottleneck'],
          where: { NOT: { bottleneck: null } },
          _count: { _all: true },
        }),
        this.prisma.massTicket.groupBy({
          by: ['currentProcess'],
          _count: { _all: true },
        }),
        this.prisma.massTicket.count({
          where: { completionDate: { gte: this.dateOnly(new Date()) } },
        }),
        this.prisma.massTicket.groupBy({
          by: ['lastStatus'],
          _count: { _all: true },
        }),
      ]);

    const count = (rows: { _count: { _all: number } }[]) =>
      rows.reduce((sum, r) => sum + r._count._all, 0);

    // Open vs closed dinilai dari teks status OCA, bukan dari status internal,
    // supaya angkanya bisa dibandingkan langsung dengan laporan dari OCA.
    let open = 0;
    let closed = 0;
    const statuses = byLastStatus.map((r) => {
      const label = (r.lastStatus ?? '').trim() || 'Blank / Tidak Terisi';
      const jumlah = r._count._all;
      if (this.CLOSED_PATTERN.test(label)) closed += jumlah;
      else open += jumlah;
      return { label, count: jumlah };
    });
    statuses.sort((a, b) => b.count - a.count);

    return {
      total,
      completedToday,
      lastStatusSummary: { total, open, closed, statuses },
      inProgress: count(byStatus.filter((r) => r.overallStatus === 'In Progress')),
      completed: count(byStatus.filter((r) => r.overallStatus === 'Completed')),
      byStatus: byStatus.map((r) => ({
        label: r.overallStatus ?? '(kosong)',
        count: r._count._all,
      })),
      byAgeing: byAgeing.map((r) => ({
        label: r.ageingBucket ?? '(kosong)',
        count: r._count._all,
      })),
      byBottleneck: byBottleneck.map((r) => ({
        label: r.bottleneck ?? '(kosong)',
        count: r._count._all,
      })),
      byProcess: byProcess.map((r) => ({
        label: r.currentProcess ?? '(kosong)',
        count: r._count._all,
      })),
    };
  }

  // ------------------------------------------------------- langkah proses

  listProcessSteps(includeInactive = false) {
    return this.prisma.massProcessStep.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { order: 'asc' },
    });
  }

  async createProcessStep(dto: CreateProcessStepDto) {
    const last = await this.prisma.massProcessStep.findFirst({
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    return this.prisma.massProcessStep.create({
      data: {
        name: dto.name.trim(),
        order: dto.order ?? (last?.order ?? -1) + 1,
      },
    });
  }

  async updateProcessStep(id: string, dto: UpdateProcessStepDto) {
    await this.requireProcessStep(id);
    return this.prisma.massProcessStep.update({ where: { id }, data: dto });
  }

  /**
   * Langkah baku tidak dihapus permanen, hanya dinonaktifkan — tiket lama
   * masih menyimpan namanya di processSteps dan perlu tetap terbaca.
   */
  async deleteProcessStep(id: string) {
    const step = await this.requireProcessStep(id);
    if (step.isDefault) {
      await this.prisma.massProcessStep.update({
        where: { id },
        data: { isActive: false },
      });
      return { deleted: false, deactivated: true };
    }
    await this.prisma.massProcessStep.delete({ where: { id } });
    return { deleted: true, deactivated: false };
  }

  // -------------------------------------------------------------- daftar staf

  listStaff(role?: 'AGENT' | 'TEAM_LEADER', includeInactive = false) {
    return this.prisma.massStaff.findMany({
      where: {
        ...(role ? { role } : {}),
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    });
  }

  async createStaff(dto: CreateStaffDto) {
    const name = dto.name.trim();
    const existing = await this.prisma.massStaff.findUnique({
      where: { name_role: { name, role: dto.role } },
    });
    if (existing) {
      throw new ConflictException(
        `"${name}" sudah terdaftar sebagai ${dto.role === 'AGENT' ? 'agent' : 'team leader'}.`,
      );
    }
    return this.prisma.massStaff.create({ data: { name, role: dto.role } });
  }

  async updateStaff(id: string, dto: UpdateStaffDto) {
    await this.requireStaff(id);
    return this.prisma.massStaff.update({
      where: { id },
      data: { ...(dto.name ? { name: dto.name.trim() } : {}), ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}) },
    });
  }

  /**
   * Dinonaktifkan, bukan dihapus: namanya masih tersimpan di tiket lama dan
   * riwayat penugasan, dan harus tetap terbaca di sana.
   */
  async deleteStaff(id: string) {
    const staff = await this.requireStaff(id);
    await this.prisma.massStaff.update({
      where: { id },
      data: { isActive: false },
    });
    return {
      deleted: false,
      deactivated: true,
      message: `"${staff.name}" dinonaktifkan. Tiket lama yang memakainya tidak berubah.`,
    };
  }

  private async requireStaff(id: string) {
    const staff = await this.prisma.massStaff.findUnique({ where: { id } });
    if (!staff) throw new NotFoundException('Nama tidak ditemukan di daftar staf');
    return staff;
  }

  // ----------------------------------------------------------------- helpers

  private async requireTicket(ticketNumber: string) {
    const ticket = await this.prisma.massTicket.findUnique({
      where: { ticketNumber },
    });
    if (!ticket) {
      throw new NotFoundException(`Tiket ${ticketNumber} tidak ditemukan`);
    }
    return ticket;
  }

  private async requireProcessStep(id: string) {
    const step = await this.prisma.massProcessStep.findUnique({ where: { id } });
    if (!step) throw new NotFoundException('Langkah proses tidak ditemukan');
    return step;
  }

  private async writeHistoryForChanges(
    before: MassTicket,
    after: MassTicket,
    actor?: string,
    notes?: string,
  ) {
    const watched: { field: keyof MassTicket; label: string }[] = [
      { field: 'validationStatus', label: 'Validation' },
      { field: 'profilingStatus', label: 'Profiling Preparation' },
      { field: 'overallStatus', label: 'Overall Status' },
      { field: 'currentProcess', label: 'Current Process' },
    ];

    const entries = watched
      .map(({ field, label }) => ({
        label,
        from: String(before[field] ?? ''),
        to: String(after[field] ?? ''),
      }))
      .filter((e) => e.from !== e.to);

    if (!entries.length) return;

    await this.prisma.massTicketHistory.createMany({
      data: entries.map((e) => ({
        ticketId: after.id,
        ticketNumber: after.ticketNumber,
        agent: after.agent ?? '',
        teamLeader: after.teamLeader ?? '',
        process: e.label,
        previousStatus: e.from,
        newStatus: e.to,
        notes: notes ?? null,
        orderId: after.profilingOrderId ?? null,
        bottleneck: after.bottleneck ?? null,
        actionBy: actor ?? after.agent ?? null,
      })),
    });
  }

  /** undefined berarti "kolom tidak ada di baris", bukan "kosongkan nilainya". */
  private optionalText(value?: string | null): string | null | undefined {
    if (value === undefined) return undefined;
    return value?.trim() || null;
  }

  private parseDate(value?: string | null): Date | null {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private parseInt(value?: number | string | null): number | null {
    if (value === undefined || value === null || value === '') return null;
    const num = Number(String(value).replace(/[^\d-]/g, ''));
    return Number.isFinite(num) ? num : null;
  }

  /** Normalisasi ke tengah malam UTC agar cocok dengan kolom @db.Date. */
  private dateOnly(date: Date): Date {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
  }
}
