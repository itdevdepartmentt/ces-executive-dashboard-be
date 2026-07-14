import { Controller, Get, Post, Body, Patch, Param, UseGuards, Req, Query, Delete } from '@nestjs/common';
import { QaReconciliationService } from './qa-reconciliation.service';
import { CreateQaReconciliationDto } from './dto/create-qa-reconciliation.dto';
import { UpdateQaReconciliationDto } from './dto/update-qa-reconciliation.dto';
import { JwtAuthGuard } from '../../common/guard/jwt-auth.guard';
import { RolesGuard } from '../../common/guard/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('qa/reconciliation')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QaReconciliationController {
  constructor(private readonly qaReconciliationService: QaReconciliationService) {}

  @Post()
  @Roles('TL')
  create(@Body() createDto: CreateQaReconciliationDto) {
    return this.qaReconciliationService.create(createDto);
  }

  @Get()
  @Roles('ADMIN', 'QC', 'TL_QC', 'TL')
  findAll(
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Req() req?: any
  ) {
    return this.qaReconciliationService.findAll(req.user, sortBy, sortOrder, search, status);
  }

  @Delete(':id')
  @Roles('QC', 'TL_QC')
  remove(@Param('id') id: string) {
    return this.qaReconciliationService.remove(id);
  }

  @Get(':id')
  @Roles('ADMIN', 'QC', 'TL_QC', 'TL')
  findOne(@Param('id') id: string) {
    return this.qaReconciliationService.findOne(id);
  }

  @Patch(':id/approve')
  @Roles('QC', 'TL_QC')
  approve(@Param('id') id: string, @Body() updateDto: UpdateQaReconciliationDto) {
    return this.qaReconciliationService.approve(id, updateDto);
  }

  @Patch(':id/reject')
  @Roles('QC', 'TL_QC')
  reject(@Param('id') id: string, @Body() updateDto: UpdateQaReconciliationDto) {
    return this.qaReconciliationService.reject(id, updateDto);
  }

  @Post(':id/reply')
  @Roles('TL', 'QC', 'TL_QC', 'ADMIN')
  reply(@Param('id') id: string, @Req() req: any, @Body('message') message: string) {
    return this.qaReconciliationService.reply(id, req.user, message);
  }
}
