import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { UploadTicketRowDto } from './dto/mass-process.dto';

/**
 * Pemetaan judul kolom Excel ke field tiket.
 *
 * Judulnya mengikuti sheet Output milik Apps Script, tapi dicocokkan setelah
 * dinormalisasi (huruf kecil, tanpa spasi dan tanda baca) supaya variasi
 * penulisan seperti "Ticket Number", "ticket_number", dan "TICKET NUMBER"
 * sama-sama dikenali. Beberapa alias ditambahkan karena file hasil ekspor
 * CESIA memakai nama yang sedikit berbeda.
 */
const COLUMN_MAP: Record<string, keyof UploadTicketRowDto> = {
  ticketnumber: 'ticketNumber',
  nomortiket: 'ticketNumber',
  ticketsubject: 'ticketSubject',
  subject: 'ticketSubject',
  laststatus: 'lastStatus',
  status: 'lastStatus',
  ticketcreated: 'ticketCreated',
  createdat: 'ticketCreated',
  tanggaltiket: 'ticketCreated',
  jumlahmsisdn: 'jumlahMsisdn',
  msisdn: 'jumlahMsisdn',
  detailcategory: 'detailCategory',
  subcategory: 'subCategory',
  category: 'category',
  namaperusahaan: 'namaPerusahaan',
  perusahaan: 'namaPerusahaan',
  corporatename: 'namaPerusahaan',
  projectid: 'projectId',
};

export interface ParseResult {
  rows: UploadTicketRowDto[];
  /** Judul kolom yang tidak dikenali — ditampilkan agar salah format cepat ketahuan. */
  unmappedColumns: string[];
  /** Baris yang dilewati beserta alasannya. */
  skipped: { row: number; reason: string }[];
  totalRows: number;
}

@Injectable()
export class MassExcelService {
  private readonly logger = new Logger(MassExcelService.name);

  async parse(buffer: Buffer): Promise<ParseResult> {
    const workbook = new ExcelJS.Workbook();

    try {
      await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
    } catch {
      throw new BadRequestException(
        'Berkas tidak bisa dibaca. Pastikan formatnya .xlsx, bukan .xls atau .csv.',
      );
    }

    const sheet = workbook.worksheets[0];
    if (!sheet || sheet.rowCount < 2) {
      throw new BadRequestException(
        'Sheet pertama kosong atau hanya berisi baris judul.',
      );
    }

    const headerRow = sheet.getRow(1);
    const mapping = new Map<number, keyof UploadTicketRowDto>();
    const unmappedColumns: string[] = [];

    headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const raw = this.cellText(cell.value);
      if (!raw) return;
      const field = COLUMN_MAP[this.normalize(raw)];
      if (field) mapping.set(colNumber, field);
      else unmappedColumns.push(raw);
    });

    if (![...mapping.values()].includes('ticketNumber')) {
      throw new BadRequestException(
        'Kolom nomor tiket tidak ditemukan. Pastikan ada kolom berjudul "Ticket Number".',
      );
    }

    const rows: UploadTicketRowDto[] = [];
    const skipped: { row: number; reason: string }[] = [];
    const seen = new Set<string>();
    let totalRows = 0;

    for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
      const row = sheet.getRow(rowNumber);
      const entry: Record<string, string | undefined> = {};
      let hasValue = false;

      for (const [colNumber, field] of mapping) {
        const text = this.cellText(row.getCell(colNumber).value);
        if (text) {
          entry[field] = text;
          hasValue = true;
        }
      }

      if (!hasValue) continue; // baris kosong di tengah file, bukan kesalahan
      totalRows++;

      const ticketNumber = entry.ticketNumber?.trim();
      if (!ticketNumber) {
        skipped.push({ row: rowNumber, reason: 'nomor tiket kosong' });
        continue;
      }

      // Duplikat dalam satu file: yang terakhir menang, tapi tetap dilaporkan
      // supaya pengguna tahu filenya mengandung baris ganda.
      if (seen.has(ticketNumber)) {
        skipped.push({
          row: rowNumber,
          reason: `nomor tiket ${ticketNumber} muncul lebih dari sekali`,
        });
      }
      seen.add(ticketNumber);

      rows.push(entry as unknown as UploadTicketRowDto);
    }

    this.logger.log(
      `Excel terbaca: ${rows.length} baris dipakai, ${skipped.length} dilewati, ${unmappedColumns.length} kolom tidak dikenal.`,
    );

    return { rows, unmappedColumns, skipped, totalRows };
  }

  /** Sel Excel bisa berupa teks, angka, tanggal, rumus, atau rich text. */
  private cellText(value: ExcelJS.CellValue): string | undefined {
    if (value === null || value === undefined) return undefined;

    if (value instanceof Date) return value.toISOString();

    if (typeof value === 'object') {
      const obj = value as unknown as Record<string, unknown>;
      if ('text' in obj) return String(obj.text).trim() || undefined;
      if ('result' in obj) return String(obj.result).trim() || undefined;
      if ('richText' in obj && Array.isArray(obj.richText)) {
        return (
          (obj.richText as { text: string }[])
            .map((part) => part.text)
            .join('')
            .trim() || undefined
        );
      }
      if ('hyperlink' in obj) return undefined;
    }

    const text = String(value).trim();
    return text || undefined;
  }

  private normalize(header: string): string {
    return header.toLowerCase().replace(/[^a-z0-9]/g, '');
  }
}
