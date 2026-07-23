import { Module } from '@nestjs/common';
import { QaController } from './qa.controller';
import { QaService } from './qa.service';
import { QaProductivityController } from './qa-productivity.controller';
import { QaProductivityService } from './qa-productivity.service';
import { PrismaModule } from 'prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [QaController, QaProductivityController],
  providers: [QaService, QaProductivityService],
  exports: [QaService, QaProductivityService],
})
export class QaModule {}
