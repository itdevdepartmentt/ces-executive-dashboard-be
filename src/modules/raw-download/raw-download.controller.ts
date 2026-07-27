import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import express from 'express';
import { JwtAuthGuard } from '../../common/guard/jwt-auth.guard';
import { RolesGuard } from '../../common/guard/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RawDownloadService } from './raw-download.service';

@Controller('raw-download')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'QC', 'TL_QC', 'TL')
export class RawDownloadController {
  constructor(private readonly service: RawDownloadService) {}

  @Get('omnix')
  async downloadRawOmnix(
    @Res() res: express.Response,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.sendExcelFile(res, 'omnix', { startDate, endDate });
  }

  @Get('oca')
  async downloadRawOca(
    @Res() res: express.Response,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.sendExcelFile(res, 'oca', { startDate, endDate });
  }

  @Get('call')
  async downloadRawCall(
    @Res() res: express.Response,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.sendExcelFile(res, 'call', { startDate, endDate });
  }

  @Get('news-log')
  @Roles('QC', 'TL_QC', 'ADMIN')
  async downloadNewsLog(
    @Res() res: express.Response,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.sendExcelFile(res, 'news-log', { startDate, endDate });
  }

  private async sendExcelFile(
    res: express.Response,
    type: 'omnix' | 'oca' | 'call' | 'news-log',
    dateRange?: { startDate?: string; endDate?: string },
  ) {
    const buffer = await this.service.generateWorkbookBuffer(type, dateRange);
    const filename = this.service.getFileName(type);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    return res.send(buffer);
  }
}
