import { FormField } from '@prisma/client';
import { EboRekapService } from './ebo-rekap.service';
import { MasalahBaris } from './ebo-rekap.service';

jest.mock('prisma/prisma.service', () => ({ PrismaService: class {} }), {
  virtual: true,
});
jest.mock('./forms.service', () => ({ FormsService: class {} }));

const service = new EboRekapService(
  {} as never,
  {} as never,
) as unknown as {
  ratakanTabel(field: FormField, nilai: unknown): string;
  uraikanTabel(field: FormField, teks: string): Record<string, unknown>[];
  siapkanNilai(
    field: FormField,
    mentah: string | number | null,
    baris: number,
    peringatan: MasalahBaris[],
  ): unknown;
};

const TABEL = {
  key: 'msisdnRows',
  label: 'Daftar MSISDN',
  type: 'TABLE',
  columns: [
    { key: 'msisdn', label: 'MSISDN' },
    { key: 'nama', label: 'Nama' },
    { key: 'pricePlan', label: 'Price Plan' },
    { key: 'clsDomestic', label: 'CLS Domestic' },
    { key: 'clsRoaming', label: 'CLS Roaming' },
    { key: 'fitur', label: 'Fitur' },
  ],
} as unknown as FormField;

const angka = (validation: unknown = null) =>
  ({ key: 'quantity', label: 'Quantity', type: 'NUMBER', validation }) as unknown as FormField;

describe('rekap EBO: tabel MSISDN', () => {
  it('meratakan baris persis seperti berkas lama', () => {
    const hasil = service.ratakanTabel(TABEL, [
      {
        msisdn: '081121912564',
        nama: 'PT. TOYAMILINDO',
        pricePlan: 'New Teamplan 11GB',
        clsDomestic: '-',
        clsRoaming: '-',
        fitur: '-',
      },
    ]);

    expect(hasil).toBe(
      'Row 1: MSISDN=081121912564 | NAMA=PT. TOYAMILINDO | PRICE PLAN=New Teamplan 11GB | CLS DOMESTIC=- | CLS ROAMING=- | FITUR=-',
    );
  });

  it('menomori ulang tiap baris', () => {
    const hasil = service.ratakanTabel(TABEL, [{ msisdn: 'a' }, { msisdn: 'b' }]);
    expect(hasil.split('\n').map((b) => b.slice(0, 6))).toEqual([
      'Row 1:',
      'Row 2:',
    ]);
  });

  it('membaca label "PRICE PLAN / PAKET" milik data lama', () => {
    // 1432 dari 1520 baris di berkas lama memakai label panjang ini. Tanpa
    // pencocokan longgar, isinya hilang diam-diam saat diunggah.
    const [baris] = service.uraikanTabel(
      TABEL,
      'Row 1: MSISDN=628111 | NAMA=PT A | PRICE PLAN / PAKET=Flash 250K | CLS DOMESTIC=Rp1 | CLS ROAMING=Rp1 | FITUR=-',
    );

    expect(baris.pricePlan).toBe('Flash 250K');
    expect(baris.msisdn).toBe('628111');
  });

  it('bolak-balik tanpa kehilangan isi', () => {
    const asal = [
      {
        msisdn: '0811-1017-2006',
        nama: 'PT BARRY',
        pricePlan: 'Compack Enterprise Bronze',
        clsDomestic: 'Rp350.000',
        clsRoaming: 'Rp1',
        fitur: '-',
      },
    ];
    expect(service.uraikanTabel(TABEL, service.ratakanTabel(TABEL, asal))).toEqual(
      asal,
    );
  });

  it('mengabaikan baris kosong dan penomoran yang tidak rapi', () => {
    expect(service.uraikanTabel(TABEL, '\n  \nMSISDN=628 | NAMA=PT B\n')).toEqual([
      { msisdn: '628', nama: 'PT B' },
    ]);
  });
});

describe('rekap EBO: nilai angka', () => {
  it('menerima angka utuh', () => {
    const peringatan: MasalahBaris[] = [];
    expect(service.siapkanNilai(angka(), '12', 2, peringatan)).toBe(12);
    expect(peringatan).toHaveLength(0);
  });

  it('menyimpan keterangan tambahan sebagai teks, bukan angka raksasa', () => {
    // "1 081141500169" pernah berubah jadi 1081141500169 karena spasinya
    // dibuang sebelum dikonversi.
    const peringatan: MasalahBaris[] = [];
    expect(service.siapkanNilai(angka(), '1 081141500169', 9, peringatan)).toBe(
      '1 081141500169',
    );
    expect(peringatan[0].baris).toBe(9);
  });

  it('menyimpan "1 Postpaid" sebagai teks', () => {
    const peringatan: MasalahBaris[] = [];
    expect(service.siapkanNilai(angka(), '1 Postpaid', 7, peringatan)).toBe(
      '1 Postpaid',
    );
    expect(peringatan).toHaveLength(1);
  });

  it('menerima koma sebagai pemisah desimal', () => {
    expect(service.siapkanNilai(angka(), '1,5', 2, [])).toBe(1.5);
  });

  it('menganggap sel kosong sebagai tidak diisi', () => {
    expect(service.siapkanNilai(angka(), '   ', 2, [])).toBeUndefined();
    expect(service.siapkanNilai(angka(), null, 2, [])).toBeUndefined();
  });
});

describe('rekap EBO: nilai pilihan', () => {
  const pilihan = {
    key: 'basicService',
    label: 'Basic Service',
    type: 'SELECT',
    options: [{ value: 'HALO ENTERPRISE', label: 'HALO ENTERPRISE' }],
  } as unknown as FormField;

  it('tetap menyimpan nilai di luar daftar, hanya memberi catatan', () => {
    // Di data lama kolom ini berisi teks bebas; menolaknya akan membuang
    // hampir seluruh berkas.
    const peringatan: MasalahBaris[] = [];
    expect(service.siapkanNilai(pilihan, 'Sesuai CPQ', 8, peringatan)).toBe(
      'Sesuai CPQ',
    );
    expect(peringatan[0].pesan).toContain('bukan pilihan terdaftar');
  });

  it('tidak memberi catatan untuk nilai yang terdaftar', () => {
    const peringatan: MasalahBaris[] = [];
    expect(service.siapkanNilai(pilihan, 'HALO ENTERPRISE', 2, peringatan)).toBe(
      'HALO ENTERPRISE',
    );
    expect(peringatan).toHaveLength(0);
  });
});
