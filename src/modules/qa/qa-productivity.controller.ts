import { Controller, Get, Post, Body, Query, UseGuards, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { QaProductivityService } from './qa-productivity.service';
import { JwtAuthGuard } from '../../common/guard/jwt-auth.guard';
import { RolesGuard } from '../../common/guard/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('qa/productivity')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QaProductivityController {
  constructor(private readonly qaProductivityService: QaProductivityService) {}

  @Get('dashboard')
  @Roles('ADMIN', 'QC', 'TL_QC')
  getDashboard(
    @Query('month') month: string,
    @Query('year') year: string,
    @Query('date') date: string,
    @Req() req: any,
  ) {
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    return this.qaProductivityService.getDashboard(m, y, date, req.user);
  }

  @Get('settings')
  @Roles('ADMIN', 'TL_QC')
  getSettings() {
    return this.qaProductivityService.getSettings();
  }

  @Post('settings')
  @Roles('ADMIN', 'TL_QC')
  saveSettings(@Body() body: any) {
    return this.qaProductivityService.saveSettings(body);
  }

  @Post('settings/parse-excel')
  @Roles('ADMIN', 'TL_QC')
  @UseInterceptors(FileInterceptor('file'))
  parseExcel(@UploadedFile() file: Express.Multer.File) {
    return this.qaProductivityService.parseExcelSettings(file);
  }
}
