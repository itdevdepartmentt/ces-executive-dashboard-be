import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/roles.guard';
import {
  CreateFieldDto,
  CreateFormDto,
  CreateSectionDto,
  ReorderDto,
  UpdateFieldDto,
  UpdateFormDto,
  UpdateSectionDto,
} from './dto/form.dto';
import { FormsService } from './forms.service';

/**
 * Pengaturan struktur form: definisi, section, dan field.
 *
 * Membaca definisi terbuka untuk semua pengguna yang login, karena dibutuhkan
 * untuk merender form. Mengubah strukturnya dibatasi ADMIN — satu field yang
 * salah ubah berdampak ke seluruh submission berikutnya.
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('forms')
export class FormsController {
  constructor(private readonly formsService: FormsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.QC, UserRole.TL_QC, UserRole.TL, UserRole.USER)
  listForms(@Query('includeInactive') includeInactive?: string) {
    return this.formsService.listForms(includeInactive === 'true');
  }

  @Get(':key')
  @Roles(UserRole.ADMIN, UserRole.QC, UserRole.TL_QC, UserRole.TL, UserRole.USER)
  getForm(
    @Param('key') key: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.formsService.getForm(key, includeInactive === 'true');
  }

  @Post()
  @Roles(UserRole.ADMIN)
  createForm(@Body() dto: CreateFormDto) {
    return this.formsService.createForm(dto);
  }

  @Patch(':key')
  @Roles(UserRole.ADMIN)
  updateForm(@Param('key') key: string, @Body() dto: UpdateFormDto) {
    return this.formsService.updateForm(key, dto);
  }

  @Delete(':key')
  @Roles(UserRole.ADMIN)
  deleteForm(@Param('key') key: string) {
    return this.formsService.deleteForm(key);
  }

  /** Mengisi definisi hasil migrasi Apps Script. Aman dijalankan berulang. */
  @Post('seed')
  @Roles(UserRole.ADMIN)
  seedDefaults() {
    return this.formsService.seedDefaults();
  }

  // ----------------------------------------------------------------- section

  @Post(':key/sections')
  @Roles(UserRole.ADMIN)
  createSection(@Param('key') key: string, @Body() dto: CreateSectionDto) {
    return this.formsService.createSection(key, dto);
  }

  @Patch('sections/:sectionId')
  @Roles(UserRole.ADMIN)
  updateSection(
    @Param('sectionId') sectionId: string,
    @Body() dto: UpdateSectionDto,
  ) {
    return this.formsService.updateSection(sectionId, dto);
  }

  @Delete('sections/:sectionId')
  @Roles(UserRole.ADMIN)
  deleteSection(@Param('sectionId') sectionId: string) {
    return this.formsService.deleteSection(sectionId);
  }

  // ------------------------------------------------------------------- field

  @Post(':key/fields')
  @Roles(UserRole.ADMIN)
  createField(@Param('key') key: string, @Body() dto: CreateFieldDto) {
    return this.formsService.createField(key, dto);
  }

  @Patch(':key/fields/reorder')
  @Roles(UserRole.ADMIN)
  reorderFields(@Param('key') key: string, @Body() dto: ReorderDto) {
    return this.formsService.reorderFields(key, dto);
  }

  @Patch('fields/:fieldId')
  @Roles(UserRole.ADMIN)
  updateField(@Param('fieldId') fieldId: string, @Body() dto: UpdateFieldDto) {
    return this.formsService.updateField(fieldId, dto);
  }

  /** Default-nya menonaktifkan; permanent=true baru benar-benar menghapus. */
  @Delete('fields/:fieldId')
  @Roles(UserRole.ADMIN)
  deleteField(
    @Param('fieldId') fieldId: string,
    @Query('permanent') permanent?: string,
  ) {
    return this.formsService.deleteField(fieldId, permanent === 'true');
  }
}
