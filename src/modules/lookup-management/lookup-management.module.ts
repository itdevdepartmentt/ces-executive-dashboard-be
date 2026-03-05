import { Module } from '@nestjs/common';
import { LookupManagementController } from './lookup-management.controller';
import { LookupManagementService } from './lookup-management.service';

@Module({
  controllers: [LookupManagementController],
  providers: [LookupManagementService],
})
export class LookupManagementModule {}
