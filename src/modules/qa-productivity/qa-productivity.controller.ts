import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { QaProductivityService } from './qa-productivity.service';
import { JwtAuthGuard } from '../../common/guard/jwt-auth.guard';

@Controller('qa/productivity')
@UseGuards(JwtAuthGuard)
export class QaProductivityController {
  constructor(private readonly qaProductivityService: QaProductivityService) {}

  @Get('settings')
  async getSettings() {
    return this.qaProductivityService.getSettings();
  }

  @Post('settings')
  async updateSettings(@Body() body: any) {
    return this.qaProductivityService.updateSettings(body);
  }

  @Get('dashboard')
  async getDashboardData(
    @Query('month') month?: string,
    @Query('year') year?: string,
    @Query('date') date?: string,
  ) {
    const filterMonth = month ? parseInt(month) : new Date().getMonth() + 1;
    const filterYear = year ? parseInt(year) : new Date().getFullYear();
    const filterDate = date || new Date().toISOString().split('T')[0];

    return this.qaProductivityService.getDashboardData(filterMonth, filterYear, filterDate);
  }
}
