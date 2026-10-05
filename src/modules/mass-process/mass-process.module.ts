import { Module } from '@nestjs/common';
import { PrismaModule } from 'prisma/prisma.module';
import { MassExcelService } from './mass-excel.service';
import { MassProcessController } from './mass-process.controller';
import { MassProcessService } from './mass-process.service';
import { MassWorkflowService } from './mass-workflow.service';

@Module({
  imports: [PrismaModule],
  controllers: [MassProcessController],
  providers: [MassProcessService, MassWorkflowService, MassExcelService],
  exports: [MassProcessService, MassWorkflowService],
})
export class MassProcessModule {}
