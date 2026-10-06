import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { FormField, Prisma } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { FormsService } from './forms.service';
import { QueryRecordDto, SubmitRecordDto, UpdateRecordDto } from './dto/record.dto';

type Values = Record<string, unknown>;

interface TableColumn {
  key: string;
  label: string;
  type?: string;
}

@Injectable()
export class FormRecordsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly formsService: FormsService,
  ) {}

  async submit(formKey: string, dto: SubmitRecordDto, createdBy?: string) {
    const form = await this.formsService.getForm(formKey);
    const values = this.validateValues(form.fields, dto.values);

    return this.prisma.formRecord.create({
      data: {
        formId: form.id,
        values: values as Prisma.InputJsonValue,
        refNumber: dto.refNumber ?? this.guessRefNumber(values),
        createdBy: createdBy ?? null,
      },
    });
  }

  async list(formKey: string, query: QueryRecordDto) {
    const form = await this.formsService.getForm(formKey, true);

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(query.limit) || 25));

    const where: Prisma.FormRecordWhereInput = { formId: form.id };
    if (query.status) where.status = query.status;
    if (query.search?.trim()) {
      // Pencarian menyasar nomor rujukan; isi JSON tidak diindeks sehingga
      // pencarian bebas ke seluruh nilai akan memaksa full scan.
      where.refNumber = { contains: query.search.trim(), mode: 'insensitive' };
    }

    const [total, data] = await Promise.all([
      this.prisma.formRecord.count({ where }),
      this.prisma.formRecord.findMany({
        where,
        orderBy: { createdAt: query.sort === 'asc' ? 'asc' : 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data,
      meta: { total, page, limit, lastPage: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  async findOne(id: string) {
    const record = await this.prisma.formRecord.findUnique({
      where: { id },
      include: {
        form: {
          include: {
            sections: { orderBy: { order: 'asc' } },
            fields: { orderBy: { order: 'asc' } },
          },
        },
      },
    });
    if (!record) throw new NotFoundException('Record tidak ditemukan');
    return record;
  }

  async update(id: string, dto: UpdateRecordDto) {
    const record = await this.findOne(id);

    const data: Prisma.FormRecordUpdateInput = {};
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.refNumber !== undefined) data.refNumber = dto.refNumber;

    if (dto.values !== undefined) {
      // Field yang sudah dinonaktifkan tetap diterima saat edit, supaya record
      // lama masih bisa diperbaiki tanpa menghidupkan ulang field-nya.
      const merged = {
        ...(record.values as Values),
        ...dto.values,
      };
      data.values = this.validateValues(
        record.form.fields,
        merged,
        true,
      ) as Prisma.InputJsonValue;
    }

    return this.prisma.formRecord.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.formRecord.delete({ where: { id } });
    return { deleted: true };
  }

  /**
   * Mencari riwayat pengajuan berdasarkan nama perusahaan, menggantikan
   * searchPSBCorporateTickets milik Apps Script.
   *
   * Memakai query mentah karena filter JSON Prisma tidak punya mode abai
   * huruf besar-kecil, padahal nama perusahaan diketik bebas oleh pengguna.
   */
  async searchByCorporate(formKey: string, keyword: string) {
    const term = keyword.trim();
    if (!term) return [];

    const form = await this.formsService.getForm(formKey, true);

    return this.prisma.$queryRaw<
      {
        id: string;
        refNumber: string | null;
        corporateName: string | null;
        projectId: string | null;
        createdAt: Date;
      }[]
    >`
      SELECT
        id,
        "ref_number"            AS "refNumber",
        values->>'corporateName' AS "corporateName",
        values->>'projectId'     AS "projectId",
        "createdAt"
      FROM "FormRecord"
      WHERE "form_id" = ${form.id}
        AND values->>'corporateName' ILIKE ${'%' + term + '%'}
      ORDER BY "createdAt" DESC
      LIMIT 100;
    `;
  }

  /** Rekap ringkas: jumlah record per status dan per hari. */
  async summary(formKey: string) {
    const form = await this.formsService.getForm(formKey, true);

    const byStatus = await this.prisma.formRecord.groupBy({
      by: ['status'],
      where: { formId: form.id },
      _count: { _all: true },
    });

    const total = byStatus.reduce((sum, row) => sum + row._count._all, 0);

    return {
      form: { key: form.key, name: form.name },
      total,
      byStatus: byStatus.map((row) => ({
        status: row.status,
        count: row._count._all,
      })),
    };
  }

  // -------------------------------------------------------------- validation

  /**
   * Memeriksa nilai terhadap definisi field yang tersimpan.
   *
   * Dikumpulkan dulu seluruh pelanggarannya baru dilempar sekali, supaya
   * pengguna tidak memperbaiki satu per satu lewat percobaan berulang.
   */
  private validateValues(
    fields: FormField[],
    input: Values,
    allowInactive = false,
  ): Values {
    const errors: string[] = [];
    const out: Values = {};
    const usable = allowInactive ? fields : fields.filter((f) => f.isActive);

    for (const field of usable) {
      const raw = input[field.key];
      const empty =
        raw === undefined ||
        raw === null ||
        (typeof raw === 'string' && raw.trim() === '') ||
        (Array.isArray(raw) && raw.length === 0);

      if (empty) {
        if (field.required) errors.push(`"${field.label}" wajib diisi.`);
        if (field.defaultValue != null) out[field.key] = field.defaultValue;
        continue;
      }

      const result = this.coerce(field, raw);
      if (result.error) {
        errors.push(result.error);
      } else {
        out[field.key] = result.value;
      }
    }

    // Nilai yang tidak punya definisi field dibuang, bukan disimpan diam-diam:
    // data tanpa definisi tidak bisa ditampilkan maupun diaudit.
    const known = new Set(usable.map((f) => f.key));
    const unknown = Object.keys(input).filter((k) => !known.has(k));
    if (unknown.length) {
      errors.push(
        `Field tidak dikenal: ${unknown.join(', ')}. Hapus atau daftarkan dulu di pengaturan form.`,
      );
    }

    if (errors.length) throw new BadRequestException(errors);
    return out;
  }

  private coerce(
    field: FormField,
    raw: unknown,
  ): { value?: unknown; error?: string } {
    const label = field.label;

    switch (field.type) {
      case 'NUMBER': {
        const num = Number(raw);
        if (!Number.isFinite(num)) return { error: `"${label}" harus berupa angka.` };
        const rules = (field.validation ?? {}) as Record<string, number>;
        if (rules.min != null && num < rules.min) {
          return { error: `"${label}" minimal ${rules.min}.` };
        }
        if (rules.max != null && num > rules.max) {
          return { error: `"${label}" maksimal ${rules.max}.` };
        }
        return { value: num };
      }

      case 'BOOLEAN':
        return { value: raw === true || raw === 'true' || raw === 1 };

      case 'DATE':
      case 'DATETIME': {
        const date = new Date(String(raw));
        if (Number.isNaN(date.getTime())) {
          return { error: `"${label}" bukan tanggal yang valid.` };
        }
        return { value: date.toISOString() };
      }

      case 'SELECT': {
        const allowed = this.optionValues(field);
        if (!allowed.includes(String(raw))) {
          return {
            error: `"${label}" harus salah satu dari: ${allowed.join(', ')}.`,
          };
        }
        return { value: String(raw) };
      }

      case 'MULTISELECT': {
        const allowed = this.optionValues(field);
        const list = Array.isArray(raw) ? raw.map(String) : [String(raw)];
        const invalid = list.filter((v) => !allowed.includes(v));
        if (invalid.length) {
          return {
            error: `"${label}" berisi pilihan tidak dikenal: ${invalid.join(', ')}.`,
          };
        }
        return { value: list };
      }

      case 'FILE': {
        const list = Array.isArray(raw) ? raw : [raw];
        return { value: list.map(String) };
      }

      case 'TABLE': {
        if (!Array.isArray(raw)) {
          return { error: `"${label}" harus berupa daftar baris.` };
        }
        const columns = (field.columns ?? []) as unknown as TableColumn[];
        const rows: Values[] = [];

        for (const [index, row] of raw.entries()) {
          if (typeof row !== 'object' || row === null) {
            return { error: `"${label}" baris ${index + 1} tidak valid.` };
          }
          const source = row as Values;
          const cleaned: Values = {};
          const missing: string[] = [];

          for (const col of columns) {
            const cell = source[col.key];
            if (cell === undefined || cell === null || String(cell).trim() === '') {
              missing.push(col.label);
            } else {
              cleaned[col.key] = String(cell).trim();
            }
          }

          if (missing.length) {
            return {
              error: `"${label}" baris ${index + 1} belum lengkap: ${missing.join(', ')}.`,
            };
          }
          rows.push(cleaned);
        }

        if (field.required && rows.length === 0) {
          return { error: `"${label}" minimal satu baris.` };
        }
        return { value: rows };
      }

      default: {
        const text = String(raw).trim();
        const rules = (field.validation ?? {}) as Record<string, unknown>;
        const maxLength = rules.maxLength as number | undefined;
        if (maxLength && text.length > maxLength) {
          return { error: `"${label}" maksimal ${maxLength} karakter.` };
        }
        const pattern = rules.pattern as string | undefined;
        if (pattern && !new RegExp(pattern).test(text)) {
          return { error: `"${label}" tidak sesuai format yang diminta.` };
        }
        return { value: text };
      }
    }
  }

  private optionValues(field: FormField): string[] {
    const options = (field.options ?? []) as unknown as { value: string }[];
    return options.map((o) => String(o.value));
  }

  /** Nomor rujukan diambil dari field yang lazim dipakai sebagai identitas. */
  private guessRefNumber(values: Values): string | null {
    for (const key of ['ticketId', 'ticketNumber', 'projectId', 'documentNumber']) {
      const candidate = values[key];
      if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
    }
    return null;
  }
}
