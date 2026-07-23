import { Module } from '@nestjs/common';
import { QaReconciliationController } from './qa-reconciliation.controller';
import { QaReconciliationService } from './qa-reconciliation.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [QaReconciliationController],
  providers: [QaReconciliationService]
})
export class QaReconciliationModule {}
