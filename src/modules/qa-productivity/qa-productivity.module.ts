import { Module } from '@nestjs/common';
import { QaProductivityController } from './qa-productivity.controller';
import { QaProductivityService } from './qa-productivity.service';

@Module({
  controllers: [QaProductivityController],
  providers: [QaProductivityService],
})
export class QaProductivityModule {}
