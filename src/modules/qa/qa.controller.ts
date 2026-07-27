import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards, UseInterceptors, UploadedFile, Query, Req, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { QaService } from './qa.service';
import { JwtAuthGuard } from '../../common/guard/jwt-auth.guard';
import { RolesGuard } from '../../common/guard/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('qa/form-tapping')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QaController {
  constructor(private readonly qaService: QaService) {}

  @Post()
  @Roles('ADMIN', 'QC', 'TL_QC')
  create(@Body() createData: any) {
    return this.qaService.createFormTapping(createData);
  }

  // Pending Tickets Endpoints
  @Get('test-tickets')
  testTickets() {
    return this.qaService.getPendingTickets(1, 10);
  }

  @Get('tickets')
  @Roles('ADMIN', 'QC', 'TL_QC', 'TL')
  getTickets(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('filters') filters?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
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
      sortBy,
      sortOrder
    );
  }

  @Get('tickets/export')
  @Roles('ADMIN', 'QC', 'TL_QC', 'TL')
  async exportTickets(
    @Res() res: Response,
    @Query('search') search?: string,
    @Query('filters') filters?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Req() req?: any,
  ) {
    const buffer = await this.qaService.exportPendingTickets(search, filters, req.user, sortBy, sortOrder);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="pending-tickets-${new Date().getTime()}.xlsx"`);
    return res.send(buffer);
  }

  @Get('tickets/options')
  @Roles('ADMIN', 'QC', 'TL_QC', 'TL')
  getTicketFilterOptions(@Req() req: any) {
    return this.qaService.getTicketFilterOptions(req.user);
  }

  @Get('tickets/:id')
  @Roles('ADMIN', 'QC', 'TL_QC', 'TL')
  getTicketById(@Param('id') id: string) {
    return this.qaService.getPendingTicketById(id);
  }

  @Post('tickets/upload')
  @Roles('ADMIN', 'QC', 'TL_QC', 'TL')
  @UseInterceptors(FileInterceptor('file'))
  uploadTickets(@UploadedFile() file: Express.Multer.File) {
    return this.qaService.uploadTickets(file);
  }

  @Post('tickets/sync-oca')
  @Roles('ADMIN', 'QC', 'TL_QC')
  syncTicketsFromOca(@Body() body: { startDate: string, endDate: string }) {
    return this.qaService.syncTicketsFromOca(body.startDate, body.endDate);
  }

  @Delete('tickets/:id')
  @Roles('ADMIN', 'QC', 'TL_QC')
  removeTicket(@Param('id') id: string) {
    return this.qaService.deletePendingTicket(id);
  }




  @Get()
  @Roles('ADMIN', 'QC', 'TL', 'TL_QC')
  getAllFormTapping(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('filters') filters?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
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
      sortBy,
      sortOrder
    );
  }

  @Get('qa-score')
  @Roles('ADMIN', 'QC', 'TL', 'TL_QC', 'USER')
  getQaScoreDashboard(
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Query('agent') agent?: string,
    @Query('peak') peak?: string,
    @Query('teamLeader') teamLeader?: string,
    @Req() req?: any,
  ) {
    return this.qaService.getQaScoreDashboard(year, month, agent, peak, req.user, teamLeader);
  }

  @Get('detail-tapping')
  @Roles('ADMIN', 'QC', 'TL', 'TL_QC', 'USER')
  getDetailTapping(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Query('agent') agent?: string,
    @Query('peak') peak?: string,
    @Query('teamLeader') teamLeader?: string,
    @Query('search') search?: string,
    @Query('filters') filters?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Req() req?: any,
  ) {
    const parsedPage = page ? parseInt(page, 10) : 1;
    const parsedLimit = limit ? parseInt(limit, 10) : 100;
    return this.qaService.getDetailTapping(
      parsedPage, parsedLimit, year, month, agent, peak, search, filters, sortBy, sortOrder, req.user, teamLeader
    );
  }

  @Get('detail-tapping/options')
  @Roles('ADMIN', 'QC', 'TL', 'TL_QC', 'USER')
  getDetailTappingFilterOptions(@Req() req: any) {
    return this.qaService.getDetailTappingFilterOptions(req.user);
  }

  @Get('options')
  @Roles('ADMIN', 'QC', 'TL', 'TL_QC')
  getHistoryFilterOptions(@Req() req: any) {
    return this.qaService.getHistoryFilterOptions(req.user);
  }

  @Get('export')
  @Roles('ADMIN', 'QC', 'TL', 'TL_QC')
  async exportAllFormTapping(
    @Res() res: Response,
    @Query('search') search?: string,
    @Query('filters') filters?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Req() req?: any,
  ) {
    const buffer = await this.qaService.exportAllFormTapping(search, filters, req?.user, sortBy, sortOrder);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="form-tapping-${new Date().getTime()}.xlsx"`);
    return res.send(buffer);
  }

  @Get(':id')
  @Roles('ADMIN', 'QC', 'TL', 'TL_QC')
  findOne(@Param('id') id: string) {
    return this.qaService.getFormTappingById(id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'QC', 'TL_QC')
  update(@Param('id') id: string, @Body() updateData: any) {
    return this.qaService.updateFormTapping(id, updateData);
  }

  @Patch(':id/komitmen')
  @Roles('ADMIN', 'QC', 'TL', 'TL_QC', 'USER')
  updateKomitmen(@Param('id') id: string, @Body('komitmen') komitmen: string, @Req() req: any) {
    return this.qaService.updateKomitmen(id, komitmen, req.user);
  }

  @Patch(':id/komitmen/approve')
  @Roles('ADMIN', 'TL')
  approveKomitmen(@Param('id') id: string, @Req() req: any) {
    return this.qaService.approveKomitmen(id, req.user);
  }

  @Patch(':id/komitmen/reject')
  @Roles('ADMIN', 'TL')
  rejectKomitmen(@Param('id') id: string, @Req() req: any) {
    return this.qaService.rejectKomitmen(id, req.user);
  }

  @Delete(':id')
  @Roles('ADMIN', 'QC', 'TL_QC')
  remove(@Param('id') id: string) {
    return this.qaService.deleteFormTapping(id);
  }
}

