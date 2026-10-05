import { BadRequestException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { MassExcelService } from './mass-excel.service';

/** Membangun berkas xlsx di memori agar tes tidak bergantung pada fixture. */
async function buildWorkbook(rows: unknown[][]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Sheet1');
  rows.forEach((row) => sheet.addRow(row));
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

const HEADERS = [
  'Ticket Number',
  'Ticket Subject',
  'Last Status',
  'Ticket Created',
  'Jumlah MSISDN',
  'Nama Perusahaan',
  'Project ID',
];

describe('MassExcelService', () => {
  const service = new MassExcelService();

  it('membaca baris dengan judul kolom standar', async () => {
    const buffer = await buildWorkbook([
      HEADERS,
      ['MASS-1', 'Migrasi', 'Open', '2026-09-20', '500', 'PT Satu', 'PRJ-1'],
      ['MASS-2', 'Aktivasi', 'Open', '2026-10-01', '120', 'PT Dua', 'PRJ-2'],
    ]);

    const result = await service.parse(buffer);

    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].ticketNumber).toBe('MASS-1');
    expect(result.rows[0].namaPerusahaan).toBe('PT Satu');
    expect(result.rows[1].jumlahMsisdn).toBe('120');
    expect(result.unmappedColumns).toEqual([]);
    expect(result.skipped).toEqual([]);
  });

  it('mengenali variasi penulisan judul kolom', async () => {
    const buffer = await buildWorkbook([
      ['ticket_number', 'TICKET SUBJECT', 'Corporate Name'],
      ['MASS-9', 'Judul', 'PT Tiga'],
    ]);

    const result = await service.parse(buffer);

    expect(result.rows[0].ticketNumber).toBe('MASS-9');
    expect(result.rows[0].ticketSubject).toBe('Judul');
    expect(result.rows[0].namaPerusahaan).toBe('PT Tiga');
    expect(result.unmappedColumns).toEqual([]);
  });

  it('melaporkan kolom yang tidak dikenali tanpa menggagalkan parsing', async () => {
    const buffer = await buildWorkbook([
      ['Ticket Number', 'Kolom Aneh', 'Catatan Internal'],
      ['MASS-3', 'abc', 'def'],
    ]);

    const result = await service.parse(buffer);

    expect(result.rows).toHaveLength(1);
    expect(result.unmappedColumns).toEqual(['Kolom Aneh', 'Catatan Internal']);
  });

  it('menolak berkas tanpa kolom nomor tiket', async () => {
    const buffer = await buildWorkbook([
      ['Nama Perusahaan', 'Project ID'],
      ['PT Empat', 'PRJ-4'],
    ]);

    await expect(service.parse(buffer)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('menolak sheet yang hanya berisi judul', async () => {
    const buffer = await buildWorkbook([HEADERS]);
    await expect(service.parse(buffer)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('menolak berkas yang bukan xlsx', async () => {
    await expect(
      service.parse(Buffer.from('ini bukan spreadsheet')),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('melewati baris kosong di tengah berkas tanpa menganggapnya kesalahan', async () => {
    const buffer = await buildWorkbook([
      ['Ticket Number', 'Nama Perusahaan'],
      ['MASS-5', 'PT Lima'],
      [null, null],
      ['MASS-6', 'PT Enam'],
    ]);

    const result = await service.parse(buffer);

    expect(result.rows.map((r) => r.ticketNumber)).toEqual(['MASS-5', 'MASS-6']);
    expect(result.skipped).toEqual([]);
    expect(result.totalRows).toBe(2);
  });

  it('melaporkan baris yang nomor tiketnya kosong', async () => {
    const buffer = await buildWorkbook([
      ['Ticket Number', 'Nama Perusahaan'],
      ['', 'PT Tanpa Nomor'],
      ['MASS-7', 'PT Tujuh'],
    ]);

    const result = await service.parse(buffer);

    expect(result.rows).toHaveLength(1);
    expect(result.skipped).toEqual([{ row: 2, reason: 'nomor tiket kosong' }]);
  });

  it('melaporkan nomor tiket ganda dalam satu berkas', async () => {
    const buffer = await buildWorkbook([
      ['Ticket Number', 'Nama Perusahaan'],
      ['MASS-8', 'PT Versi Lama'],
      ['MASS-8', 'PT Versi Baru'],
    ]);

    const result = await service.parse(buffer);

    // Keduanya tetap dikirim — upsert membuat yang terakhir menang — tapi
    // penggunanya diberi tahu bahwa berkasnya mengandung baris ganda.
    expect(result.rows).toHaveLength(2);
    expect(result.skipped[0].reason).toContain('lebih dari sekali');
  });

  it('mengubah sel tanggal Excel menjadi ISO', async () => {
    const tanggal = new Date('2026-09-20T03:00:00.000Z');
    const buffer = await buildWorkbook([
      ['Ticket Number', 'Ticket Created'],
      ['MASS-10', tanggal],
    ]);

    const result = await service.parse(buffer);

    expect(result.rows[0].ticketCreated).toBe(tanggal.toISOString());
  });

  it('membaca angka sebagai teks tanpa kehilangan nilainya', async () => {
    const buffer = await buildWorkbook([
      ['Ticket Number', 'Jumlah MSISDN'],
      ['MASS-11', 1500],
    ]);

    const result = await service.parse(buffer);

    expect(result.rows[0].jumlahMsisdn).toBe('1500');
  });
});
