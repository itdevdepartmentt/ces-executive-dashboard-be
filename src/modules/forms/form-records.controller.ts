import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { UserRole } from '@prisma/client';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/roles.guard';
import {
  QueryRecordDto,
  SubmitRecordDto,
  UpdateRecordDto,
} from './dto/record.dto';
import { EboRekapService } from './ebo-rekap.service';
import { FormExportService } from './form-export.service';
import { FormRecordsService } from './form-records.service';

const ALL_ROLES = [
  UserRole.ADMIN,
  UserRole.QC,
  UserRole.TL_QC,
  UserRole.TL,
  UserRole.USER,
] as const;

/** Submit dan rekap, dikelompokkan di bawah form yang bersangkutan. */
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('forms')
export class FormRecordsController {
  constructor(
    private readonly records: FormRecordsService,
    private readonly rekap: EboRekapService,
  ) {}

  @Post(':key/records')
  @Roles(...ALL_ROLES)
  submit(
    @Param('key') key: string,
    @Body() dto: SubmitRecordDto,
    @Req() req: { user?: { email?: string; sub?: string } },
  ) {
    const createdBy = req.user?.email ?? req.user?.sub;
    return this.records.submit(key, dto, createdBy);
  }

  @Get(':key/records')
  @Roles(...ALL_ROLES)
  list(@Param('key') key: string, @Query() query: QueryRecordDto) {
    return this.records.list(key, query);
  }

  /** Riwayat pengajuan sebuah perusahaan, dipakai sebelum membuat permintaan baru. */
  @Get(':key/records/by-corporate')
  @Roles(...ALL_ROLES)
  searchByCorporate(
    @Param('key') key: string,
    @Query('name') name = '',
    @Query('source') source?: string,
  ) {
    return this.records.searchByCorporate(key, name, source);
  }

  @Get(':key/records/summary')
  @Roles(...ALL_ROLES)
  summary(@Param('key') key: string) {
    return this.records.summary(key);
  }

  /**
   * Seluruh submission dalam satu berkas, memakai tata kolom rekap lama
   * sehingga bisa ditukar langsung dengan berkas dari aplikasi sebelumnya.
   */
  @Get(':key/records/rekap')
  @Roles(...ALL_ROLES)
  async exportRekap(@Param('key') key: string, @Res() res: Response) {
    const { buffer, fileName } = await this.rekap.exportRekap(key);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(fileName)}"`,
    );
    res.send(buffer);
  }

  /**
   * Memasukkan rekap lama. Dibatasi ADMIN karena satu berkas bisa menambah
   * ratusan record sekaligus dan tidak ada tombol batalnya.
   */
  @Post(':key/records/rekap')
  @Roles(UserRole.ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  importRekap(
    @Param('key') key: string,
    @Req() req: { user?: { email?: string; sub?: string } },
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Berkas belum dipilih.');

    return this.rekap.importRekap(
      key,
      file.buffer,
      req.user?.email ?? req.user?.sub,
    );
  }
}

/** Operasi terhadap satu record, lepas dari form key-nya. */
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('form-records')
export class FormRecordItemController {
  constructor(
    private readonly records: FormRecordsService,
    private readonly exporter: FormExportService,
  ) {}

  @Get()
  @Roles(...ALL_ROLES)
  list(@Query() query: QueryRecordDto) {
    return this.records.listSubmissions(query);
  }

  @Get(':id')
  @Roles(...ALL_ROLES)
  findOne(@Param('id') id: string) {
    return this.records.findOne(id);
  }

  @Get(':id/export')
  @Roles(...ALL_ROLES)
  async exportXlsx(@Param('id') id: string, @Res() res: Response) {
    const { buffer, fileName } = await this.exporter.exportRecord(id);

    this.sendDownload(res, buffer, fileName);
  }

  @Post(':id/export')
  @Roles(...ALL_ROLES)
  async generateXlsx(@Param('id') id: string, @Res() res: Response) {
    const { buffer, fileName } = await this.exporter.exportRecord(id);
    await this.records.markGenerated(id);
    this.sendDownload(res, buffer, fileName);
  }

  private sendDownload(res: Response, buffer: Buffer, fileName: string) {
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(fileName)}"`,
    );
    res.send(buffer);
  }

  @Patch(':id')
  @Roles(...ALL_ROLES)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRecordDto,
    @Req() req: { user: { id: string; name: string; email: string } },
  ) {
    return this.records.update(id, dto, req.user);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.records.remove(id);
  }
}
