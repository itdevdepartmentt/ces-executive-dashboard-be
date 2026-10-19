import { BadRequestException, Injectable } from '@nestjs/common';
import { FormField, Prisma } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import { PrismaService } from 'prisma/prisma.service';
import { FormsService } from './forms.service';
import {
  FIELD_TABEL_AKTIVASI,
  KolomRekap,
  REKAP_EBO,
  samakanJudul,
  STATUS_IMPOR,
  TataRekap,
} from './ebo-rekap-layout';

type Values = Record<string, unknown>;

interface TableColumn {
  key: string;
  label: string;
}

export interface MasalahBaris {
  baris: number;
  pesan: string;
}

export interface HasilImpor {
  sheet: string;
  totalBaris: number;
  dibuat: number;
  dilewati: MasalahBaris[];
  peringatan: MasalahBaris[];
  kolomTakDikenal: string[];
}

/** Baris ditulis per potongan supaya berkas ratusan baris tidak jadi satu transaksi raksasa. */
const UKURAN_POTONGAN = 100;

/**
 * Rekap gabungan seluruh submission sebuah form, dalam tata letak berkas
 * "Rekap Submit Form EBO.xlsx" milik aplikasi lama.
 *
 * Berbeda dengan FormExportService yang mengeluarkan satu berkas per record,
 * di sini satu berkas berisi semua record — itulah bentuk yang dipakai tim
 * sebelum pindah ke CESIA, jadi berkasnya harus bisa ditukar dua arah.
 */
@Injectable()
export class EboRekapService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly forms: FormsService,
  ) {}

  /** Form yang punya padanan rekap lama; dipakai juga oleh frontend. */
  static dukung(formKey: string): boolean {
    return formKey in REKAP_EBO;
  }

  // --------------------------------------------------------------- unduh

  async exportRekap(
    formKey: string,
  ): Promise<{ buffer: Buffer; fileName: string }> {
    const { tata, form } = await this.muatTata(formKey);

    const records = await this.prisma.formRecord.findMany({
      where: { formId: form.id },
      orderBy: { createdAt: 'asc' },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'CESIA';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet(tata.sheet);
    sheet.columns = tata.kolom.map((k) => ({
      header: k.judul,
      width: k.lebar,
    }));
    this.hiasKepala(sheet.getRow(1));
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    const byKey = new Map(form.fields.map((f) => [f.key, f]));

    for (const record of records) {
      const values = (record.values ?? {}) as Values;
      sheet.addRow(
        tata.kolom.map((kolom) =>
          this.selKeluar(kolom, record, values, byKey),
        ),
      );
    }

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const tanggal = new Date().toISOString().slice(0, 10);

    return { buffer, fileName: `Rekap ${tata.sheet} ${tanggal}.xlsx` };
  }

  private selKeluar(
    kolom: KolomRekap,
    record: { id: string; createdAt: Date },
    values: Values,
    byKey: Map<string, FormField>,
  ): ExcelJS.CellValue {
    if (kolom.khusus === 'timestamp') return record.createdAt;

    if (kolom.khusus === 'msisdnRows') {
      const field = byKey.get(FIELD_TABEL_AKTIVASI);
      return field ? this.ratakanTabel(field, values[field.key]) : '';
    }

    if (kolom.khusus === 'msisdnCount') {
      const baris = values[FIELD_TABEL_AKTIVASI];
      return Array.isArray(baris) ? baris.length : 0;
    }

    // Padanan kolom "Doc" lama, yang dulu berisi tautan spreadsheet Drive.
    if (kolom.khusus === 'doc') {
      const dasar = (process.env.APP_PUBLIC_URL ?? '').replace(/\/+$/, '');
      return `${dasar}/forms/records/${record.id}`;
    }

    if (!kolom.field) return '';

    const nilai = values[kolom.field];
    if (nilai === undefined || nilai === null) return '';
    if (typeof nilai === 'number' || typeof nilai === 'boolean') return nilai;
    if (Array.isArray(nilai)) {
      // Lampiran tidak ikut: isinya data URL yang panjangnya ribuan karakter.
      const field = byKey.get(kolom.field);
      if (field?.type === 'FILE') return nilai.length ? `${nilai.length} lampiran` : '';
      return nilai.map((v) => String(v)).join(', ');
    }
    return String(nilai);
  }

  /**
   * Bentuk rata milik aplikasi lama:
   * `Row 1: MSISDN=… | NAMA=… | PRICE PLAN=…`, satu baris tabel per baris teks.
   */
  private ratakanTabel(field: FormField, nilai: unknown): string {
    if (!Array.isArray(nilai) || nilai.length === 0) return '';
    const kolom = (field.columns ?? []) as unknown as TableColumn[];

    return nilai
      .map((baris, i) => {
        const isi = (baris ?? {}) as Values;
        const bagian = kolom.map(
          (k) => `${k.label.toUpperCase()}=${String(isi[k.key] ?? '')}`,
        );
        return `Row ${i + 1}: ${bagian.join(' | ')}`;
      })
      .join('\n');
  }

  // --------------------------------------------------------------- unggah

  async importRekap(
    formKey: string,
    buffer: Buffer,
    pengguna?: string,
  ): Promise<HasilImpor> {
    const { tata, form } = await this.muatTata(formKey);

    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
    } catch {
      throw new BadRequestException(
        'Berkas tidak bisa dibaca. Pastikan formatnya .xlsx, bukan .xls atau CSV.',
      );
    }

    const sheet =
      workbook.getWorksheet(tata.sheet) ?? workbook.worksheets[0] ?? null;
    if (!sheet) {
      throw new BadRequestException('Berkas tidak punya sheet apa pun.');
    }

    const { posisi, takDikenal } = this.petakanKolom(sheet, tata);
    const byKey = new Map(form.fields.map((f) => [f.key, f]));

    // Kunci idempoten: ID tiket + timestamp. ID tiket saja tidak cukup karena
    // di data lama satu tiket bisa muncul belasan kali.
    const sudahAda = await this.kunciYangSudahAda(form.id);

    const hasil: HasilImpor = {
      sheet: sheet.name,
      totalBaris: Math.max(0, sheet.rowCount - 1),
      dibuat: 0,
      dilewati: [],
      peringatan: [],
      kolomTakDikenal: takDikenal,
    };

    const antre: Prisma.FormRecordCreateManyInput[] = [];

    for (let r = 2; r <= sheet.rowCount; r++) {
      const row = sheet.getRow(r);
      const values: Values = {};
      let adaIsi = false;

      for (const [kolom, index] of posisi) {
        const mentah = this.bacaSel(row.getCell(index).value);
        if (kolom.khusus === 'timestamp' || kolom.khusus === 'doc') continue;
        if (kolom.khusus === 'msisdnCount') continue;

        if (kolom.khusus === 'msisdnRows') {
          const field = byKey.get(FIELD_TABEL_AKTIVASI);
          if (!field || !mentah) continue;
          const baris = this.uraikanTabel(field, String(mentah));
          if (baris.length) {
            values[field.key] = baris;
            adaIsi = true;
          }
          continue;
        }

        if (!kolom.field) continue;
        const field = byKey.get(kolom.field);
        if (!field) continue;

        const siap = this.siapkanNilai(field, mentah, r, hasil.peringatan);
        if (siap !== undefined) {
          values[field.key] = siap;
          adaIsi = true;
        }
      }

      if (!adaIsi) continue;

      const timestamp = this.bacaTanggal(posisi, row, tata);
      const ticketId = values.ticketId ? String(values.ticketId) : null;
      const kunci = `${ticketId ?? ''}|${timestamp?.toISOString() ?? ''}`;

      if (sudahAda.has(kunci)) {
        hasil.dilewati.push({
          baris: r,
          pesan: `${ticketId ?? '(tanpa ID tiket)'} dengan timestamp yang sama sudah ada.`,
        });
        continue;
      }
      sudahAda.add(kunci);

      antre.push({
        formId: form.id,
        values: values as Prisma.InputJsonValue,
        status: STATUS_IMPOR,
        refNumber: ticketId,
        createdBy: pengguna ?? null,
        ...(timestamp ? { createdAt: timestamp } : {}),
      });
    }

    for (let i = 0; i < antre.length; i += UKURAN_POTONGAN) {
      const potongan = antre.slice(i, i + UKURAN_POTONGAN);
      await this.prisma.formRecord.createMany({ data: potongan });
      hasil.dibuat += potongan.length;
    }

    return hasil;
  }

  /** Mencocokkan kolom berkas dengan tata letak: lewat judul, lalu lewat posisi. */
  private petakanKolom(sheet: ExcelJS.Worksheet, tata: TataRekap) {
    const kepala = sheet.getRow(1);
    const judulDiBerkas = new Map<string, number>();
    const terpakai = new Set<number>();

    for (let c = 1; c <= sheet.columnCount; c++) {
      const judul = samakanJudul(String(this.bacaSel(kepala.getCell(c).value)));
      if (judul) judulDiBerkas.set(judul, c);
    }

    const posisi: [KolomRekap, number][] = [];
    for (const [i, kolom] of tata.kolom.entries()) {
      const lewatJudul = judulDiBerkas.get(samakanJudul(kolom.judul));
      // Berkas lama membiarkan tiga kolom terakhir tanpa judul, jadi kolom yang
      // tidak ketemu lewat judul dicari di posisi yang sama seperti tata letak.
      const index = lewatJudul ?? i + 1;
      if (index <= sheet.columnCount) {
        posisi.push([kolom, index]);
        terpakai.add(index);
      }
    }

    const takDikenal: string[] = [];
    for (const [judul, c] of judulDiBerkas) {
      if (!terpakai.has(c)) takDikenal.push(judul);
    }

    return { posisi, takDikenal };
  }

  private bacaTanggal(
    posisi: [KolomRekap, number][],
    row: ExcelJS.Row,
    tata: TataRekap,
  ): Date | null {
    const kolom = tata.kolom.find((k) => k.khusus === 'timestamp');
    const index = posisi.find(([k]) => k === kolom)?.[1];
    if (!index) return null;

    const nilai = row.getCell(index).value;
    if (nilai instanceof Date) return nilai;
    if (nilai === null || nilai === undefined || nilai === '') return null;

    const tanggal = new Date(String(nilai));
    return Number.isNaN(tanggal.getTime()) ? null : tanggal;
  }

  private async kunciYangSudahAda(formId: string): Promise<Set<string>> {
    const lama = await this.prisma.formRecord.findMany({
      where: { formId },
      select: { refNumber: true, createdAt: true },
    });
    return new Set(
      lama.map((r) => `${r.refNumber ?? ''}|${r.createdAt.toISOString()}`),
    );
  }

  /**
   * Data lama tidak pernah melewati validasi CESIA, jadi nilainya diterima apa
   * adanya dan hanya diberi catatan bila menyimpang. Menolaknya akan membuang
   * hampir seluruh berkas — mis. BASIC SERVICE di sana berisi teks bebas,
   * sementara di CESIA field itu sudah jadi pilihan tertutup.
   */
  private siapkanNilai(
    field: FormField,
    mentah: string | number | null,
    baris: number,
    peringatan: MasalahBaris[],
  ): unknown {
    if (mentah === null || String(mentah).trim() === '') return undefined;

    if (field.type === 'NUMBER') {
      // Hanya angka utuh yang dijadikan number. Data lama sering menitipkan
      // keterangan di kolom ini, mis. "1 Postpaid" atau "1 081141500169";
      // membuang spasinya akan mengubah yang kedua jadi bilangan raksasa.
      const bersih = String(mentah).trim();
      const angka = /^-?\d+(?:[.,]\d+)?$/.test(bersih)
        ? Number(bersih.replace(',', '.'))
        : NaN;
      if (!Number.isFinite(angka)) {
        peringatan.push({
          baris,
          pesan: `"${field.label}" berisi "${String(mentah)}" yang bukan angka; disimpan sebagai teks.`,
        });
        return String(mentah).trim();
      }
      return angka;
    }

    const teks = String(mentah).trim();

    if (field.type === 'SELECT' || field.type === 'MULTISELECT') {
      const pilihan = ((field.options ?? []) as unknown as { value: string }[])
        .map((o) => o.value);
      if (pilihan.length && !pilihan.includes(teks)) {
        peringatan.push({
          baris,
          pesan: `"${field.label}" berisi "${teks}" yang bukan pilihan terdaftar; tetap disimpan.`,
        });
      }
      return field.type === 'MULTISELECT' ? [teks] : teks;
    }

    return teks;
  }

  /** Kebalikan dari ratakanTabel. */
  private uraikanTabel(field: FormField, teks: string): Values[] {
    const kolom = (field.columns ?? []) as unknown as TableColumn[];
    const byLabel = new Map(kolom.map((k) => [k.label.toUpperCase(), k.key]));

    return teks
      .split(/\r?\n/)
      .map((baris) => baris.replace(/^\s*Row\s+\d+\s*:\s*/i, '').trim())
      .filter(Boolean)
      .map((baris) => {
        const isi: Values = {};
        for (const bagian of baris.split('|')) {
          const pisah = bagian.indexOf('=');
          if (pisah < 0) continue;
          const label = bagian.slice(0, pisah).trim().toUpperCase();
          const nilai = bagian.slice(pisah + 1).trim();
          const key = this.cocokkanKolom(byLabel, label);
          if (key) isi[key] = nilai;
        }
        return isi;
      })
      .filter((isi) => Object.keys(isi).length > 0);
  }

  /**
   * Label kolom di data lama tidak seragam: 1432 baris memakai
   * "PRICE PLAN / PAKET" sementara 88 baris memakai "PRICE PLAN" saja.
   * Keduanya menunjuk kolom yang sama, jadi pencocokannya dilonggarkan —
   * kalau tidak, isinya hilang diam-diam saat diunggah.
   */
  private cocokkanKolom(
    byLabel: Map<string, string>,
    label: string,
  ): string | undefined {
    const persis = byLabel.get(label);
    if (persis) return persis;

    const sebelumGaring = byLabel.get(label.split('/')[0].trim());
    if (sebelumGaring) return sebelumGaring;

    for (const [dikenal, key] of byLabel) {
      if (label.startsWith(dikenal)) return key;
    }
    return undefined;
  }

  // --------------------------------------------------------------- bantu

  private async muatTata(formKey: string) {
    const tata = REKAP_EBO[formKey];
    if (!tata) {
      throw new BadRequestException(
        `Form "${formKey}" tidak punya tata letak rekap EBO. Hanya ${Object.keys(REKAP_EBO).join(' dan ')} yang didukung.`,
      );
    }
    const form = await this.forms.getForm(formKey, true);
    return { tata, form };
  }

  private bacaSel(nilai: ExcelJS.CellValue): string | number | null {
    if (nilai === null || nilai === undefined) return null;
    if (typeof nilai === 'number' || typeof nilai === 'string') return nilai;
    if (nilai instanceof Date) return nilai.toISOString();

    const objek = nilai as unknown as Record<string, unknown>;
    if (Array.isArray(objek.richText)) {
      return (objek.richText as { text: string }[])
        .map((t) => t.text)
        .join('');
    }
    if (typeof objek.text === 'string') return objek.text;
    if (typeof objek.hyperlink === 'string') return objek.hyperlink;
    if (objek.result !== undefined && objek.result !== null) {
      return String(objek.result);
    }
    return null;
  }

  private hiasKepala(row: ExcelJS.Row) {
    row.font = { bold: true };
    row.alignment = { vertical: 'middle', wrapText: true };
    row.height = 30;
  }
}
