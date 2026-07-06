import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards, UseInterceptors, UploadedFile, Query, Req } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { QaService } from './qa.service';
import { JwtAuthGuard } from '../../common/guard/jwt-auth.guard';
import { RolesGuard } from '../../common/guard/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('qa/form-tapping')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QaController {
  constructor(private readonly qaService: QaService) {}

  @Post()
  @Roles('ADMIN', 'QC')
  create(@Body() createData: any) {
    return this.qaService.createFormTapping(createData);
  }

  // Pending Tickets Endpoints
  @Get('test-tickets')
  testTickets() {
    return this.qaService.getPendingTickets(1, 10);
  }

  @Get('tickets')
  @Roles('ADMIN', 'QC')
  getTickets(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('filters') filters?: string,
    @Req() req?: any,
  ) {
    const parsedPage = page ? parseInt(page, 10) : 1;
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    
    return this.qaService.getPendingTickets(
      parsedPage,
      parsedLimit,
      search,
      filters,
      req.user,
    );
  }

  @Get('tickets/export')
  @Roles('ADMIN', 'QC')
  exportTickets(
    @Query('search') search?: string,
    @Query('filters') filters?: string,
    @Req() req?: any,
  ) {
    return this.qaService.exportPendingTickets(search, filters, req.user);
  }

  @Get('tickets/options')
  @Roles('ADMIN', 'QC')
  getTicketFilterOptions(@Req() req: any) {
    return this.qaService.getTicketFilterOptions(req.user);
  }

  @Get('tickets/:id')
  @Roles('ADMIN', 'QC')
  getTicketById(@Param('id') id: string) {
    return this.qaService.getPendingTicketById(id);
  }

  @Post('tickets/upload')
  @Roles('ADMIN', 'QC')
  @UseInterceptors(FileInterceptor('file'))
  uploadTickets(@UploadedFile() file: Express.Multer.File) {
    return this.qaService.uploadTickets(file);
  }

  @Post('tickets/sync-oca')
  @Roles('ADMIN', 'QC')
  syncTicketsFromOca(@Body() body: { startDate: string, endDate: string }) {
    return this.qaService.syncTicketsFromOca(body.startDate, body.endDate);
  }

  @Delete('tickets/:id')
  @Roles('ADMIN', 'QC')
  removeTicket(@Param('id') id: string) {
    return this.qaService.deletePendingTicket(id);
  }

  // --- History Tapping Bulk Import/Export ---
  @Get('history/export-template')
  @Roles('ADMIN', 'QC')
  exportHistoryTappingTemplate() {
    return this.qaService.exportHistoryTappingTemplate();
  }

  @Post('history/upload')
  @Roles('ADMIN', 'QC')
  @UseInterceptors(FileInterceptor('file'))
  uploadHistoryTapping(@UploadedFile() file: Express.Multer.File) {
    return this.qaService.uploadHistoryTapping(file);
  }


  @Get()
  @Roles('ADMIN', 'QC', 'TL')
  getAllFormTapping(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('filters') filters?: string,
    @Req() req?: any,
  ) {
    const parsedPage = page ? parseInt(page, 10) : 1;
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    
    return this.qaService.getAllFormTapping(
      parsedPage,
      parsedLimit,
      search,
      filters,
      req.user,
    );
  }

  @Get('qa-score')
  @Roles('ADMIN', 'QC', 'TL')
  getQaScoreDashboard(
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Query('agent') agent?: string,
    @Query('peak') peak?: string,
  ) {
    return this.qaService.getQaScoreDashboard(year, month, agent, peak);
  }

  @Get('detail-tapping')
  @Roles('ADMIN', 'QC', 'TL')
  getDetailTapping(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Query('agent') agent?: string,
    @Query('peak') peak?: string,
    @Query('search') search?: string,
    @Query('filters') filters?: string,
    @Req() req?: any,
  ) {
    const parsedPage = page ? parseInt(page, 10) : 1;
    const parsedLimit = limit ? parseInt(limit, 10) : 100;
    return this.qaService.getDetailTapping(
      parsedPage, parsedLimit, year, month, agent, peak, search, filters, req.user,
    );
  }

  @Get('detail-tapping/options')
  @Roles('ADMIN', 'QC', 'TL')
  getDetailTappingFilterOptions(@Req() req: any) {
    return this.qaService.getDetailTappingFilterOptions(req.user);
  }

  @Get('options')
  @Roles('ADMIN', 'QC', 'TL')
  getHistoryFilterOptions(@Req() req: any) {
    return this.qaService.getHistoryFilterOptions(req.user);
  }

  @Get('export')
  @Roles('ADMIN', 'QC', 'TL')
  exportAllFormTapping(
    @Query('search') search?: string,
    @Query('filters') filters?: string,
  ) {
    return this.qaService.exportAllFormTapping(search, filters);
  }

  @Get(':id')
  @Roles('ADMIN', 'QC', 'TL')
  findOne(@Param('id') id: string) {
    return this.qaService.getFormTappingById(id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'QC')
  update(@Param('id') id: string, @Body() updateData: any) {
    return this.qaService.updateFormTapping(id, updateData);
  }

  @Delete(':id')
  @Roles('ADMIN', 'QC')
  remove(@Param('id') id: string) {
    return this.qaService.deleteFormTapping(id);
  }
}
