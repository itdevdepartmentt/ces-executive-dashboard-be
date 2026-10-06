import { Injectable } from '@nestjs/common';
import { FormField, FormSection } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import { FormRecordsService } from './form-records.service';

type Values = Record<string, unknown>;

interface TableColumn {
  key: string;
  label: string;
}

/**
 * Menghasilkan XLSX dari sebuah record, menggantikan generatePSBXlsx_ dan
 * generateAktivasiXlsx_ milik Apps Script.
 *
 * Bedanya: versi lama membuat spreadsheet sementara di Drive, mengekspornya
 * lewat UrlFetchApp, lalu membuang file sementaranya. Di sini file dibangun
 * langsung di memori sehingga tidak menyentuh Drive sama sekali.
 */
@Injectable()
export class FormExportService {
  constructor(private readonly records: FormRecordsService) {}

  async exportRecord(recordId: string): Promise<{
    buffer: Buffer;
    fileName: string;
  }> {
    const record = await this.records.findOne(recordId);
    const values = (record.values ?? {}) as Values;
    const fields = record.form.fields.filter((f) => f.isActive);
    const sections = record.form.sections;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'CESIA';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Form');
    sheet.columns = [
      { header: 'DESCRIPTION', key: 'description', width: 38 },
      { header: 'KETERANGAN', key: 'note', width: 42 },
      { header: 'DATA', key: 'data', width: 46 },
    ];
    this.styleHeader(sheet.getRow(1));

    const tableFields: FormField[] = [];
    const evidenceFields: FormField[] = [];
    const bySection = this.groupBySection(fields, sections);

    for (const group of bySection) {
      if (group.label) {
        const row = sheet.addRow([group.label, '', '']);
        sheet.mergeCells(`A${row.number}:C${row.number}`);
        row.font = { bold: true };
        row.getCell(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFEFEFEF' },
        };
      }

      for (const field of group.fields) {
        if (field.type === 'TABLE') {
          tableFields.push(field);
          sheet.addRow([
            field.label,
            field.helpText ?? '',
            `Lihat sheet "${this.sheetName(field.label)}"`,
          ]);
          continue;
        }

        if (field.type === 'FILE') {
          const berkas = Array.isArray(values[field.key])
            ? (values[field.key] as unknown[])
            : [];
          evidenceFields.push(field);
          sheet.addRow([
            field.label,
            field.helpText ?? '',
            berkas.length
              ? `${berkas.length} lampiran — lihat sheet "${this.sheetName(field.label)}"`
              : 'Tidak ada lampiran',
          ]);
          continue;
        }
        sheet.addRow([
          field.label,
          field.helpText ?? '',
          this.stringify(values[field.key]),
        ]);
      }
    }

    sheet.eachRow((row) => {
      row.alignment = { vertical: 'top', wrapText: true };
    });

    for (const field of tableFields) {
      this.addTableSheet(workbook, field, values[field.key]);
    }

    for (const field of evidenceFields) {
      this.addEvidenceSheet(workbook, field, values[field.key]);
    }

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    const name = record.refNumber || record.form.name;

    return {
      buffer: Buffer.from(arrayBuffer),
      fileName: `${this.sanitize(record.form.name)} - ${this.sanitize(name)}.xlsx`,
    };
  }

  private addTableSheet(
    workbook: ExcelJS.Workbook,
    field: FormField,
    raw: unknown,
  ) {
    const columns = (field.columns ?? []) as unknown as TableColumn[];
    if (!columns.length) return;

    const sheet = workbook.addWorksheet(this.sheetName(field.label));
    sheet.columns = columns.map((col) => ({
      header: col.label,
      key: col.key,
      width: Math.max(16, col.label.length + 4),
    }));
    this.styleHeader(sheet.getRow(1));

    const rows = Array.isArray(raw) ? (raw as Values[]) : [];
    for (const row of rows) {
      sheet.addRow(columns.map((col) => this.stringify(row[col.key])));
    }
  }

  /**
   * Satu sheet per field lampiran, gambarnya ditanam langsung — menggantikan
   * createSeparateEvidenceSheets_ pada Apps Script.
   *
   * Lampiran disimpan sebagai data URL. Yang bukan gambar (mis. PDF) tidak
   * bisa ditanam ke dalam sel, jadi dicatat sebagai baris keterangan agar
   * keberadaannya tetap terlihat.
   */
  private addEvidenceSheet(
    workbook: ExcelJS.Workbook,
    field: FormField,
    raw: unknown,
  ) {
    const berkas = Array.isArray(raw) ? raw.map(String) : [];
    if (!berkas.length) return;

    const sheet = workbook.addWorksheet(this.sheetName(field.label));
    sheet.columns = [{ header: field.label, key: 'info', width: 70 }];
    this.styleHeader(sheet.getRow(1));

    let barisBerikutnya = 2;

    berkas.forEach((berkasSatu, index) => {
      const parsed = this.parseDataUrl(berkasSatu);
      const labelRow = sheet.getRow(barisBerikutnya);
      labelRow.getCell(1).value = `Lampiran ${index + 1}`;
      labelRow.font = { bold: true };
      barisBerikutnya++;

      if (!parsed || !parsed.isImage) {
        sheet.getRow(barisBerikutnya).getCell(1).value = parsed
          ? `(${parsed.mime} — tidak bisa ditampilkan di Excel)`
          : '(format lampiran tidak dikenali)';
        barisBerikutnya += 2;
        return;
      }

      const imageId = workbook.addImage({
        base64: parsed.base64,
        extension: parsed.extension as 'png' | 'jpeg' | 'gif',
      });
      sheet.addImage(imageId, {
        tl: { col: 0, row: barisBerikutnya - 1 },
        ext: { width: 460, height: 300 },
      });

      // Sisakan ruang vertikal supaya gambar berikutnya tidak bertumpuk.
      barisBerikutnya += 16;
    });
  }

  /** data:image/png;base64,XXXX -> { mime, extension, base64, isImage } */
  private parseDataUrl(value: string): {
    mime: string;
    extension: string;
    base64: string;
    isImage: boolean;
  } | null {
    const match = /^data:([^;,]+);base64,(.*)$/s.exec(value);
    if (!match) return null;

    const mime = match[1];
    const base64 = match[2];
    const subtype = mime.split('/')[1] ?? '';
    const extension = subtype === 'jpg' ? 'jpeg' : subtype;
    const isImage =
      mime.startsWith('image/') && ['png', 'jpeg', 'gif'].includes(extension);

    return { mime, extension, base64, isImage };
  }

  private groupBySection(
    fields: FormField[],
    sections: FormSection[],
  ): { label: string | null; fields: FormField[] }[] {
    const groups: { label: string | null; fields: FormField[] }[] = [];

    const loose = fields.filter((f) => !f.sectionId);
    if (loose.length) groups.push({ label: null, fields: loose });

    for (const section of sections) {
      const owned = fields.filter((f) => f.sectionId === section.id);
      if (owned.length) groups.push({ label: section.label, fields: owned });
    }
    return groups;
  }

  private styleHeader(row: ExcelJS.Row) {
    row.font = { bold: true };
    row.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9E1F2' },
    };
    row.alignment = { vertical: 'middle', horizontal: 'center' };
  }

  private stringify(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (Array.isArray(value)) return value.map((v) => this.stringify(v)).join(', ');
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  /** Nama sheet Excel dibatasi 31 karakter dan melarang beberapa simbol. */
  private sheetName(label: string): string {
    return this.sanitize(label).slice(0, 31) || 'Data';
  }

  private sanitize(name: string): string {
    return String(name).replace(/[\\/?*[\]:]/g, '-').trim();
  }
}
