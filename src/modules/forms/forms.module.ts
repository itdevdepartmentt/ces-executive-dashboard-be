import { Module } from '@nestjs/common';
import { PrismaModule } from 'prisma/prisma.module';
import { EboRekapService } from './ebo-rekap.service';
import { FormExportService } from './form-export.service';
import {
  FormRecordItemController,
  FormRecordsController,
} from './form-records.controller';
import { FormRecordsService } from './form-records.service';
import { FormsController } from './forms.controller';
import { FormsService } from './forms.service';

@Module({
  imports: [PrismaModule],
  controllers: [FormsController, FormRecordsController, FormRecordItemController],
  providers: [
    FormsService,
    FormRecordsService,
    FormExportService,
    EboRekapService,
  ],
  exports: [FormsService, FormRecordsService],
})
export class FormsModule {}
