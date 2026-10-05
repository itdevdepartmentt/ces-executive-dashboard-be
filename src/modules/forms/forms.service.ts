import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import {
  CreateFieldDto,
  CreateFormDto,
  CreateSectionDto,
  ReorderDto,
  UpdateFieldDto,
  UpdateFormDto,
  UpdateSectionDto,
} from './dto/form.dto';
import { SEED_FORMS, SEED_PROCESS_STEPS } from './forms.seed';

@Injectable()
export class FormsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------- definisi

  async listForms(includeInactive = false) {
    return this.prisma.formDefinition.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { name: 'asc' },
      include: { _count: { select: { fields: true, records: true } } },
    });
  }

  /**
   * Bentuk lengkap untuk merender form: section dan field sudah terurut.
   * includeInactive hanya dipakai layar admin; form publik tidak boleh
   * menampilkan field yang sudah dinonaktifkan.
   */
  async getForm(key: string, includeInactive = false) {
    const form = await this.prisma.formDefinition.findUnique({
      where: { key },
      include: {
        sections: { orderBy: { order: 'asc' } },
        fields: {
          where: includeInactive ? {} : { isActive: true },
          orderBy: { order: 'asc' },
        },
      },
    });
    if (!form) throw new NotFoundException(`Form "${key}" tidak ditemukan`);
    return form;
  }

  async createForm(dto: CreateFormDto) {
    await this.assertFormKeyFree(dto.key);
    return this.prisma.formDefinition.create({ data: dto });
  }

  async updateForm(key: string, dto: UpdateFormDto) {
    await this.getForm(key, true);
    return this.prisma.formDefinition.update({ where: { key }, data: dto });
  }

  /**
   * Form dihapus permanen hanya bila belum punya record. Bila sudah ada data,
   * form dinonaktifkan supaya riwayat submission tidak ikut hilang.
   */
  async deleteForm(key: string) {
    const form = await this.prisma.formDefinition.findUnique({
      where: { key },
      include: { _count: { select: { records: true } } },
    });
    if (!form) throw new NotFoundException(`Form "${key}" tidak ditemukan`);

    if (form._count.records > 0) {
      await this.prisma.formDefinition.update({
        where: { key },
        data: { isActive: false },
      });
      return {
        deleted: false,
        deactivated: true,
        message: `Form masih punya ${form._count.records} record, jadi dinonaktifkan dan bukan dihapus.`,
      };
    }

    await this.prisma.formDefinition.delete({ where: { key } });
    return { deleted: true, deactivated: false };
  }

  // ----------------------------------------------------------------- section

  async createSection(formKey: string, dto: CreateSectionDto) {
    const form = await this.getForm(formKey, true);
    await this.assertSectionKeyFree(form.id, dto.key);
    return this.prisma.formSection.create({
      data: {
        formId: form.id,
        key: dto.key,
        label: dto.label,
        order: dto.order ?? (await this.nextSectionOrder(form.id)),
      },
    });
  }

  async updateSection(sectionId: string, dto: UpdateSectionDto) {
    await this.requireSection(sectionId);
    return this.prisma.formSection.update({
      where: { id: sectionId },
      data: dto,
    });
  }

  /** Field di dalamnya tidak ikut terhapus, hanya lepas dari section. */
  async deleteSection(sectionId: string) {
    await this.requireSection(sectionId);
    await this.prisma.formSection.delete({ where: { id: sectionId } });
    return { deleted: true };
  }

  // ------------------------------------------------------------------- field

  async createField(formKey: string, dto: CreateFieldDto) {
    const form = await this.getForm(formKey, true);
    await this.assertFieldKeyFree(form.id, dto.key);
    this.assertFieldShape(dto.type, dto.options, dto.columns);

    if (dto.sectionId) await this.requireSection(dto.sectionId, form.id);

    return this.prisma.formField.create({
      data: {
        formId: form.id,
        sectionId: dto.sectionId ?? null,
        key: dto.key,
        label: dto.label,
        type: dto.type,
        helpText: dto.helpText ?? null,
        required: dto.required ?? false,
        order: dto.order ?? (await this.nextFieldOrder(form.id)),
        options: this.toJson(dto.options),
        validation: this.toJson(dto.validation),
        columns: this.toJson(dto.columns),
        defaultValue: dto.defaultValue ?? null,
      },
    });
  }

  async updateField(fieldId: string, dto: UpdateFieldDto) {
    const field = await this.requireField(fieldId);

    const type = dto.type ?? field.type;
    const options = dto.options ?? (field.options as unknown);
    const columns = dto.columns ?? (field.columns as unknown);
    this.assertFieldShape(type, options, columns);

    if (dto.sectionId) await this.requireSection(dto.sectionId, field.formId);

    const data: Prisma.FormFieldUpdateInput = {};
    if (dto.label !== undefined) data.label = dto.label;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.helpText !== undefined) data.helpText = dto.helpText;
    if (dto.required !== undefined) data.required = dto.required;
    if (dto.order !== undefined) data.order = dto.order;
    if (dto.defaultValue !== undefined) data.defaultValue = dto.defaultValue;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.options !== undefined) data.options = this.toJson(dto.options);
    if (dto.validation !== undefined) data.validation = this.toJson(dto.validation);
    if (dto.columns !== undefined) data.columns = this.toJson(dto.columns);
    if (dto.sectionId !== undefined) {
      data.section = dto.sectionId
        ? { connect: { id: dto.sectionId } }
        : { disconnect: true };
    }

    return this.prisma.formField.update({ where: { id: fieldId }, data });
  }

  /**
   * Field yang sudah dipakai record tidak dihapus permanen secara default:
   * nilainya masih tersimpan di JSON record dan dibutuhkan untuk audit.
   * Gunakan permanent bila memang ingin membuangnya.
   */
  async deleteField(fieldId: string, permanent = false) {
    const field = await this.requireField(fieldId);

    if (permanent) {
      await this.prisma.formField.delete({ where: { id: fieldId } });
      return {
        deleted: true,
        deactivated: false,
        message:
          'Field dihapus permanen. Nilai lama pada record tetap ada di JSON, tapi tidak lagi punya definisi.',
      };
    }

    await this.prisma.formField.update({
      where: { id: fieldId },
      data: { isActive: false },
    });
    return {
      deleted: false,
      deactivated: true,
      message: `Field "${field.label}" dinonaktifkan. Data lama tetap utuh.`,
    };
  }

  /** Dipanggil saat field digeser di UI; satu transaksi untuk semua posisi. */
  async reorderFields(formKey: string, dto: ReorderDto) {
    const form = await this.getForm(formKey, true);
    const ids = dto.items.map((i) => i.id);

    const count = await this.prisma.formField.count({
      where: { id: { in: ids }, formId: form.id },
    });
    if (count !== ids.length) {
      throw new BadRequestException(
        'Ada field yang bukan milik form ini atau tidak ditemukan.',
      );
    }

    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.formField.update({
          where: { id: item.id },
          data: { order: item.order },
        }),
      ),
    );
    return this.getForm(formKey, true);
  }

  // -------------------------------------------------------------------- seed

  /**
   * Mengisi definisi form hasil migrasi dari Apps Script.
   *
   * Hanya membuat yang belum ada. Field, section, atau langkah proses yang
   * sudah pernah dibuat tidak pernah ditimpa, supaya perubahan yang dilakukan
   * admin lewat UI tidak hilang bila seed dijalankan ulang.
   */
  async seedDefaults() {
    const summary = {
      formsCreated: [] as string[],
      sectionsCreated: 0,
      fieldsCreated: 0,
      processStepsCreated: 0,
      skippedFields: [] as string[],
    };

    for (const seedForm of SEED_FORMS) {
      let form = await this.prisma.formDefinition.findUnique({
        where: { key: seedForm.key },
      });

      if (!form) {
        form = await this.prisma.formDefinition.create({
          data: {
            key: seedForm.key,
            name: seedForm.name,
            description: seedForm.description ?? null,
          },
        });
        summary.formsCreated.push(seedForm.key);
      }

      const sectionIdByKey = new Map<string, string>();
      for (const [index, seedSection] of seedForm.sections.entries()) {
        let section = await this.prisma.formSection.findUnique({
          where: { formId_key: { formId: form.id, key: seedSection.key } },
        });
        if (!section) {
          section = await this.prisma.formSection.create({
            data: {
              formId: form.id,
              key: seedSection.key,
              label: seedSection.label,
              order: index,
            },
          });
          summary.sectionsCreated++;
        }
        sectionIdByKey.set(seedSection.key, section.id);
      }

      for (const [index, seedField] of seedForm.fields.entries()) {
        const existing = await this.prisma.formField.findUnique({
          where: { formId_key: { formId: form.id, key: seedField.key } },
        });
        if (existing) {
          summary.skippedFields.push(`${seedForm.key}.${seedField.key}`);
          continue;
        }

        await this.prisma.formField.create({
          data: {
            formId: form.id,
            sectionId: seedField.section
              ? (sectionIdByKey.get(seedField.section) ?? null)
              : null,
            key: seedField.key,
            label: seedField.label,
            type: seedField.type,
            helpText: seedField.helpText ?? null,
            required: seedField.required ?? false,
            order: index,
            options: this.toJson(seedField.options),
            columns: this.toJson(seedField.columns),
            validation: this.toJson(undefined),
          },
        });
        summary.fieldsCreated++;
      }
    }

    for (const [index, name] of SEED_PROCESS_STEPS.entries()) {
      const existing = await this.prisma.massProcessStep.findUnique({
        where: { name },
      });
      if (!existing) {
        await this.prisma.massProcessStep.create({
          data: { name, order: index, isDefault: true },
        });
        summary.processStepsCreated++;
      }
    }

    return summary;
  }

  // ----------------------------------------------------------------- helpers

  /** Prisma membedakan "JSON null" dari "tidak diubah", jadi dipetakan eksplisit. */
  private toJson(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
    if (value === undefined || value === null) return Prisma.JsonNull;
    return value as Prisma.InputJsonValue;
  }

  private async assertFormKeyFree(key: string) {
    const existing = await this.prisma.formDefinition.findUnique({
      where: { key },
    });
    if (existing) throw new ConflictException(`Form dengan key "${key}" sudah ada`);
  }

  private async assertSectionKeyFree(formId: string, key: string) {
    const existing = await this.prisma.formSection.findUnique({
      where: { formId_key: { formId, key } },
    });
    if (existing) {
      throw new ConflictException(`Section "${key}" sudah ada di form ini`);
    }
  }

  private async assertFieldKeyFree(formId: string, key: string) {
    const existing = await this.prisma.formField.findUnique({
      where: { formId_key: { formId, key } },
    });
    if (existing) {
      throw new ConflictException(`Field "${key}" sudah ada di form ini`);
    }
  }

  /** SELECT tanpa pilihan dan TABLE tanpa kolom tidak bisa dirender. */
  private assertFieldShape(type: string, options: unknown, columns: unknown) {
    if (type === 'SELECT' || type === 'MULTISELECT') {
      if (!Array.isArray(options) || options.length === 0) {
        throw new BadRequestException(
          `Field bertipe ${type} wajib punya minimal satu pilihan pada "options".`,
        );
      }
    }
    if (type === 'TABLE') {
      if (!Array.isArray(columns) || columns.length === 0) {
        throw new BadRequestException(
          'Field bertipe TABLE wajib punya minimal satu kolom pada "columns".',
        );
      }
    }
  }

  private async requireSection(sectionId: string, formId?: string) {
    const section = await this.prisma.formSection.findUnique({
      where: { id: sectionId },
    });
    if (!section) throw new NotFoundException('Section tidak ditemukan');
    if (formId && section.formId !== formId) {
      throw new BadRequestException('Section tersebut bukan milik form ini');
    }
    return section;
  }

  private async requireField(fieldId: string) {
    const field = await this.prisma.formField.findUnique({
      where: { id: fieldId },
    });
    if (!field) throw new NotFoundException('Field tidak ditemukan');
    return field;
  }

  private async nextFieldOrder(formId: string) {
    const last = await this.prisma.formField.findFirst({
      where: { formId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    return (last?.order ?? -1) + 1;
  }

  private async nextSectionOrder(formId: string) {
    const last = await this.prisma.formSection.findFirst({
      where: { formId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    return (last?.order ?? -1) + 1;
  }
}
