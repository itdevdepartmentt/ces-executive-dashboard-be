import {
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
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { UserRole } from '@prisma/client';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/roles.guard';
import { QueryRecordDto, SubmitRecordDto, UpdateRecordDto } from './dto/record.dto';
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
  constructor(private readonly records: FormRecordsService) {}

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
}

/** Operasi terhadap satu record, lepas dari form key-nya. */
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('form-records')
export class FormRecordItemController {
  constructor(
    private readonly records: FormRecordsService,
    private readonly exporter: FormExportService,
  ) {}

  @Get(':id')
  @Roles(...ALL_ROLES)
  findOne(@Param('id') id: string) {
    return this.records.findOne(id);
  }

  @Get(':id/export')
  @Roles(...ALL_ROLES)
  async exportXlsx(@Param('id') id: string, @Res() res: Response) {
    const { buffer, fileName } = await this.exporter.exportRecord(id);

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
  @Roles(UserRole.ADMIN, UserRole.QC, UserRole.TL_QC, UserRole.TL)
  update(@Param('id') id: string, @Body() dto: UpdateRecordDto) {
    return this.records.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.records.remove(id);
  }
}
