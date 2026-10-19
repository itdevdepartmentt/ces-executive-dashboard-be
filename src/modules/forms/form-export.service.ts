import { Injectable } from '@nestjs/common';
import { FormField, FormSection } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import { FormRecordsService } from './form-records.service';
import {
  ACTIVATION_EXPORT_FIELDS,
  ACTIVATION_EXPORT_NOTE,
  imageDimensions,
  PSB_EXPORT_FIELDS,
  PSB_EXPORT_NOTE,
} from './ebo-export-layout';

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
    if (['ebo-psb', 'ebo-aktivasi'].includes(record.form.key)) {
      return this.exportEboRecord(record);
    }
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

  private async exportEboRecord(
    record: Awaited<ReturnType<FormRecordsService['findOne']>>,
  ) {
    const values = (record.values ?? {}) as Values;
    const isPsb = record.form.key === 'ebo-psb';
    const layout: ReadonlyArray<readonly [string, string]> = isPsb
      ? PSB_EXPORT_FIELDS
      : ACTIVATION_EXPORT_FIELDS;
    const fields = record.form.fields.filter(
      (field) => field.isActive || values[field.key] !== undefined,
    );
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'CESIA';
    const sheet = workbook.addWorksheet(isPsb ? 'Form PSB' : 'Aktivasi PSB');
    sheet.getColumn(1).width = 37.63;
    sheet.getColumn(2).width = 65.13;
    this.styleHeader(sheet.addRow(['DESCRIPTION', 'DATA']));
    for (const [key, label] of layout) {
      const field = fields.find((item) => item.key === key);
      const row = sheet.addRow([
        label + (field?.required === false ? '' : ' *'),
        this.stringify(values[key]),
      ]);
      row.getCell(2).numFmt = '@';
      if (
        key === 'quantity' &&
        /^\d+(?:\.\d+)?$/.test(this.stringify(values[key]))
      ) {
        row.getCell(2).value = Number(values[key]);
        row.getCell(2).numFmt = '0';
      }
      if (key === 'collectionRate' || key === 'billingPerformance') {
        const match = /^(\d+(?:[.,]\d+)?)\s*%?$/.exec(
          this.stringify(values[key]).trim(),
        );
        if (match) {
          const percent = Number(match[1].replace(',', '.'));
          if (percent >= 0 && percent <= 100) {
            row.getCell(2).value = percent / 100;
            row.getCell(2).numFmt = Number.isInteger(percent) ? '0%' : '0.00%';
          }
        }
      }
    }
    const coreKeys = new Set<string>(layout.map(([key]) => key));
    for (const field of fields) {
      if (
        coreKeys.has(field.key) ||
        field.type === 'FILE' ||
        field.type === 'TABLE'
      )
        continue;
      sheet.addRow([
        field.label + (field.required ? ' *' : ''),
        this.cellValue(values[field.key]),
      ]);
    }
    if (isPsb) {
      const rowNumber = sheet.rowCount + 2;
      sheet.mergeCells(`A${rowNumber}:B${rowNumber}`);
      const row = sheet.getRow(rowNumber);
      row.getCell(1).value = PSB_EXPORT_NOTE;
      row.getCell(1).border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      };
      row.font = { name: 'Arial', size: 10, italic: true };
      row.height = 36;
    } else {
      const msisdn = fields.find((field) => field.key === 'msisdnRows');
      const columns = (msisdn?.columns ?? []) as unknown as TableColumn[];
      if (columns.length) {
        this.styleHeader(
          sheet.addRow(columns.map((column) => column.label.toUpperCase())),
        );
        const rows = Array.isArray(values.msisdnRows)
          ? (values.msisdnRows as Values[])
          : [];
        for (const row of rows) {
          const added = sheet.addRow(
            columns.map((column) => this.stringify(row[column.key])),
          );
          added.eachCell((cell) => {
            cell.numFmt = '@';
          });
        }
      }
      sheet.columns.slice(2).forEach((column, index) => {
        column.width = index === 3 ? 27.63 : 18.88;
      });
      const noteRow = sheet.rowCount + 2;
      const endColumn = Math.max(2, sheet.columnCount);
      sheet.mergeCells(noteRow, 1, noteRow, endColumn);
      sheet.getRow(noteRow).getCell(1).value = ACTIVATION_EXPORT_NOTE;
      sheet.getRow(noteRow).height = 36;
    }
    sheet.eachRow((row) => {
      row.font = { name: 'Arial', size: 10, ...row.font };
      if (row.number !== 1)
        row.alignment = { ...row.alignment, vertical: 'top', wrapText: true };
      if (!row.height) {
        let lines = 1;
        row.eachCell((cell) => {
          const width = sheet.getColumn(cell.col).width ?? 20;
          const count = this.stringify(cell.value)
            .split('\n')
            .reduce(
              (sum, line) => sum + Math.max(1, Math.ceil(line.length / width)),
              0,
            );
          lines = Math.max(lines, count);
        });
        row.height = Math.max(15, lines * 15);
      }
    });
    for (const field of fields.filter(
      (field) =>
        field.type === 'TABLE' && (isPsb || field.key !== 'msisdnRows'),
    ))
      this.addTableSheet(workbook, field, values[field.key]);
    for (const field of fields.filter((field) => field.type === 'FILE'))
      this.addEvidenceSheet(workbook, field, values[field.key]);
    const company =
      this.stringify(values.corporateName).trim() ||
      record.refNumber ||
      record.form.name;
    return {
      buffer: Buffer.from(await workbook.xlsx.writeBuffer()),
      fileName: `${isPsb ? 'Form PSB' : 'Form Aktivasi Kartu Baru'} - ${this.sanitize(company)}.xlsx`,
    };
  }

  private cellValue(value: unknown): ExcelJS.CellValue {
    return typeof value === 'number' || typeof value === 'boolean'
      ? value
      : this.stringify(value);
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
    const sheet = workbook.addWorksheet(this.sheetName(field.label));
    sheet.columns = [{ header: field.label, key: 'info', width: 150.13 }];
    this.styleHeader(sheet.getRow(1));
    sheet.getRow(1).font = { name: 'Arial', size: 14, bold: true };
    sheet.getRow(1).height = 24;
    if (!berkas.length) sheet.getCell('A3').value = 'Tidak ada lampiran';

    let barisBerikutnya = 3;

    berkas.forEach((berkasSatu, index) => {
      const parsed = this.parseDataUrl(berkasSatu);
      const labelRow = sheet.getRow(barisBerikutnya);
      labelRow.getCell(1).value = `Capture ${index + 1}`;
      labelRow.font = { name: 'Arial', size: 10, bold: true };
      labelRow.alignment = { horizontal: 'center' };
      labelRow.getCell(1).border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      };
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
      const dimensions = imageDimensions(
        Buffer.from(parsed.base64, 'base64'),
      ) ?? { width: 460, height: 300 };
      const scale = Math.min(
        1,
        1000 / dimensions.width,
        650 / dimensions.height,
      );
      const width = dimensions.width * scale;
      const height = dimensions.height * scale;
      sheet.addImage(imageId, {
        tl: { col: 0, row: barisBerikutnya - 1 },
        ext: { width, height },
      });

      // Sisakan ruang vertikal supaya gambar berikutnya tidak bertumpuk.
      barisBerikutnya += Math.ceil(height / 20) + 3;
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
      fgColor: { argb: 'FFB4C7E7' },
    };
    row.alignment = { vertical: 'middle', horizontal: 'center' };
  }

  private stringify(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (Array.isArray(value))
      return value.map((v) => this.stringify(v)).join(', ');
    if (typeof value === 'object') return JSON.stringify(value);
    if (typeof value === 'string') return value;
    if (
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      typeof value === 'bigint'
    )
      return String(value);
    return '';
  }

  /** Nama sheet Excel dibatasi 31 karakter dan melarang beberapa simbol. */
  private sheetName(label: string): string {
    return this.sanitize(label).slice(0, 31) || 'Data';
  }

  private sanitize(name: string): string {
    return String(name)
      .replace(/[\\/?*[\]:<>"|]/g, '-')
      .split('')
      .filter((char) => char.charCodeAt(0) >= 32)
      .join('')
      .trim()
      .replace(/[. ]+$/, '');
  }
}
