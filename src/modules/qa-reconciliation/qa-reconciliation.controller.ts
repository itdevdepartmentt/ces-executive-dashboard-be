import { Controller, Get, Post, Body, Patch, Param, UseGuards, Req } from '@nestjs/common';
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
  @Roles('ADMIN', 'QC', 'TL')
  findAll(@Req() req: any) {
    return this.qaReconciliationService.findAll(req.user);
  }

  @Get(':id')
  @Roles('ADMIN', 'QC', 'TL')
  findOne(@Param('id') id: string) {
    return this.qaReconciliationService.findOne(id);
  }

  @Patch(':id/approve')
  @Roles('QC')
  approve(@Param('id') id: string, @Body() updateDto: UpdateQaReconciliationDto) {
    return this.qaReconciliationService.approve(id, updateDto);
  }

  @Patch(':id/reject')
  @Roles('QC')
  reject(@Param('id') id: string, @Body() updateDto: UpdateQaReconciliationDto) {
    return this.qaReconciliationService.reject(id, updateDto);
  }
}
