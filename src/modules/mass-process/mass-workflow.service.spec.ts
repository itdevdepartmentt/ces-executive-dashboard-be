import { MassTicket } from '@prisma/client';
import { MassWorkflowService } from './mass-workflow.service';

const NOW = new Date('2026-10-05T10:00:00.000Z');

function ticket(overrides: Partial<MassTicket> = {}): MassTicket {
  return {
    id: 't1',
    ticketNumber: 'TKT-001',
    ticketSubject: null,
    lastStatus: 'Open',
    ticketCreated: NOW,
    jumlahMsisdn: null,
    detailCategory: null,
    subCategory: null,
    category: null,
    namaPerusahaan: null,
    projectId: null,
    agent: 'Budi',
    teamLeader: '',
    agentAssignedAt: null,
    agentChangeCount: 0,
    waktuPengerjaanKhusus: null,
    validationPicStatus: null,
    validationPicNotes: null,
    validationPksStatus: null,
    validationPksNotes: null,
    validationNodinStatus: null,
    validationNodinNotes: null,
    validationStatus: null,
    profilingStatus: null,
    profilingOrderId: null,
    profilingNotes: null,
    processSteps: null,
    confirmations: null,
    customValues: null,
    currentProcess: null,
    overallStatus: null,
    processProgress: 0,
    daysOpen: 0,
    ageingBucket: null,
    bottleneck: null,
    bottleneckSince: null,
    lastAction: null,
    lastActionBy: null,
    completionDate: null,
    uploadedAt: NOW,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  } as MassTicket;
}

describe('MassWorkflowService', () => {
  const service = new MassWorkflowService();

  describe('tahapan proses', () => {
    it('tiket baru berhenti di Validation dengan progres 0', () => {
      const r = service.calculate(ticket(), NOW);
      expect(r.currentProcess).toBe('Validation');
      expect(r.overallStatus).toBe('Not Started');
      expect(r.processProgress).toBe(0);
    });

    it('validasi terisi sebagian dianggap In Progress', () => {
      const r = service.calculate(ticket({ validationPicStatus: 'OK' }), NOW);
      expect(r.overallStatus).toBe('In Progress');
      expect(r.processProgress).toBe(0);
    });

    it('NODIN boleh kosong — PIC dan PKS OK sudah cukup untuk lolos', () => {
      const r = service.calculate(
        ticket({ validationPicStatus: 'OK', validationPksStatus: 'OK' }),
        NOW,
      );
      expect(r.validationStatus).toBe('OK');
      expect(r.currentProcess).toBe('Profiling Preparation');
      expect(r.processProgress).toBe(33);
    });

    it('NODIN NOK tetap menggagalkan validasi', () => {
      const r = service.calculate(
        ticket({
          validationPicStatus: 'OK',
          validationPksStatus: 'OK',
          validationNodinStatus: 'NOK',
        }),
        NOW,
      );
      expect(r.validationStatus).toBe('NOK');
      expect(r.currentProcess).toBe('Validation');
    });

    it('profiling selesai tanpa langkah proses berhenti di 67', () => {
      const r = service.calculate(
        ticket({
          validationPicStatus: 'OK',
          validationPksStatus: 'OK',
          profilingStatus: 'Done',
        }),
        NOW,
      );
      expect(r.currentProcess).toBe('Process Steps');
      expect(r.processProgress).toBe(67);
    });

    it('langkah proses setengah jalan menaikkan progres secara proporsional', () => {
      const r = service.calculate(
        ticket({
          validationPicStatus: 'OK',
          validationPksStatus: 'OK',
          profilingStatus: 'Done',
          processSteps: [
            { name: 'Set CLS Rp 1', status: 'Done' },
            { name: 'Change Ownership', status: '' },
          ] as never,
        }),
        NOW,
      );
      expect(r.currentProcess).toBe('Change Ownership');
      expect(r.processProgress).toBe(84); // 67 + round(50 * 0.33)
    });

    it('semua langkah selesai menutup tiket', () => {
      const r = service.calculate(
        ticket({
          validationPicStatus: 'OK',
          validationPksStatus: 'OK',
          profilingStatus: 'Done',
          processSteps: [{ name: 'Set CLS Rp 1', status: 'Done' }] as never,
        }),
        NOW,
      );
      expect(r.overallStatus).toBe('Completed');
      expect(r.processProgress).toBe(100);
      expect(r.lastStatus).toBe('Closed');
      expect(r.completionDate).toEqual(NOW);
    });
  });

  describe('deteksi bottleneck', () => {
    it('Validation NOK selalu menang', () => {
      const r = service.calculate(
        ticket({
          validationPicStatus: 'NOK',
          confirmations: { profilingBillcoApproval: { status: 'In Progress' } } as never,
        }),
        NOW,
      );
      expect(r.bottleneck).toBe('Validation NOK');
    });

    // Inilah perbaikan atas bug Apps Script: di sana delapan pemeriksaan ini
    // menunjuk kolom yang tidak pernah ada, sehingga tidak pernah terpicu.
    it('membaca konfirmasi Billco yang masih berjalan', () => {
      const r = service.calculate(
        ticket({
          validationPicStatus: 'OK',
          validationPksStatus: 'OK',
          confirmations: { profilingBillcoApproval: { status: 'In Progress' } } as never,
        }),
        NOW,
      );
      expect(r.bottleneck).toBe('Billco Approval');
    });

    it('mengikuti urutan prioritas saat ada beberapa konfirmasi berjalan', () => {
      const r = service.calculate(
        ticket({
          validationPicStatus: 'OK',
          validationPksStatus: 'OK',
          confirmations: {
            profilingBillcoApproval: { status: 'In Progress' },
            validationAmCoordination: { status: 'In Progress' },
          } as never,
        }),
        NOW,
      );
      expect(r.bottleneck).toBe('AM Coordination');
    });

    it('konfirmasi yang sudah selesai tidak dianggap bottleneck', () => {
      const r = service.calculate(
        ticket({
          validationPicStatus: 'OK',
          validationPksStatus: 'OK',
          confirmations: { validationAmCoordination: { status: 'Done' } } as never,
        }),
        NOW,
      );
      expect(r.bottleneck).toBeNull();
    });

    it('bottleneckSince dipertahankan selama penyebabnya sama', () => {
      const sejak = new Date('2026-10-01T00:00:00.000Z');
      const r = service.calculate(
        ticket({
          validationPicStatus: 'OK',
          validationPksStatus: 'OK',
          bottleneck: 'AM Coordination',
          bottleneckSince: sejak,
          confirmations: { validationAmCoordination: { status: 'In Progress' } } as never,
        }),
        NOW,
      );
      expect(r.bottleneckSince).toEqual(sejak);
    });
  });

  describe('bucket ageing', () => {
    const kasus: [number, string][] = [
      [0, '0-1 Day'],
      [1, '0-1 Day'],
      [2, '2-3 Days'],
      [5, '4-7 Days'],
      [10, '8-14 Days'],
      [20, '>14 Days'],
    ];

    it.each(kasus)('tiket berumur %i hari masuk bucket %s', (hari, bucket) => {
      const created = new Date(NOW.getTime() - hari * 86400000);
      const r = service.calculate(ticket({ ticketCreated: created }), NOW);
      expect(r.daysOpen).toBe(hari);
      expect(r.ageingBucket).toBe(bucket);
    });
  });

  describe('ringkasan koordinasi dan to-do', () => {
    it('mengumpulkan order ID profiling dan status konfirmasi', () => {
      const r = service.calculate(
        ticket({
          profilingOrderId: 'ORD-123',
          profilingStatus: 'In Progress',
          confirmations: {
            profilingBillcoApproval: { status: 'In Progress' },
            validationAmCoordination: { status: 'Done' },
          } as never,
        }),
        NOW,
      );

      expect(r.idKoordinasiSummary).toContain('Profiling Preparation: ORD-123');
      expect(r.idKoordinasiSummary).toContain('AM Coordination (Validation): Done');
      expect(r.idKoordinasiSummary).toContain(
        'Billco Approval (Profiling): In Progress',
      );
    });

    it('hanya memasukkan langkah yang punya order ID atau bernama koordinasi', () => {
      const r = service.calculate(
        ticket({
          processSteps: [
            { name: 'Set CLS Rp 1', status: 'Done' },
            { name: 'Koordinasi IT', status: 'In Progress' },
            { name: 'Add Offer/Fitur', status: 'Done', orderId: 'ORD-777' },
          ] as never,
        }),
        NOW,
      );

      expect(r.idKoordinasiSummary).not.toContain('Set CLS Rp 1');
      expect(r.idKoordinasiSummary).toContain('Koordinasi IT: In Progress');
      expect(r.idKoordinasiSummary).toContain('Add Offer/Fitur: ORD-777');
    });

    it('menomori to-do berurutan beserta statusnya', () => {
      const r = service.calculate(
        ticket({
          profilingStatus: 'Done',
          profilingOrderId: 'ORD-1',
          processSteps: [
            { name: 'Set CLS Rp 1', status: 'Done' },
            { name: 'Change Ownership', status: '', orderId: 'ORD-2' },
          ] as never,
        }),
        NOW,
      );

      const baris = r.todoSummary.split(String.fromCharCode(10));
      expect(baris[0]).toBe('1. Profiling Preparation (Done) [ORD-1]');
      expect(baris[1]).toBe('2. Set CLS Rp 1 (Done)');
      expect(baris[2]).toBe('3. Change Ownership (Not Started) [ORD-2]');
    });

    it('tiket yang belum disentuh menghasilkan ringkasan kosong', () => {
      const r = service.calculate(ticket(), NOW);
      expect(r.idKoordinasiSummary).toBe('');
      expect(r.todoSummary).toBe('');
    });
  });

  describe('parsing JSON yang longgar', () => {
    it('menerima processSteps berbentuk string', () => {
      const steps = service.readSteps('[{"name":"A","status":"Done"}]');
      expect(steps).toHaveLength(1);
      expect(steps[0].name).toBe('A');
    });

    it('JSON rusak diperlakukan sebagai kosong, bukan melempar error', () => {
      expect(service.readSteps('{bukan json')).toEqual([]);
      expect(service.readConfirmations('{bukan json')).toEqual({});
    });

    it('langkah tanpa nama dibuang', () => {
      const steps = service.readSteps([{ name: '  ' }, { name: 'B' }]);
      expect(steps.map((s) => s.name)).toEqual(['B']);
    });
  });
});
