import { Module } from '@nestjs/common';
import { RawDownloadController } from './raw-download.controller';
import { RawDownloadService } from './raw-download.service';

@Module({
  controllers: [RawDownloadController],
  providers: [RawDownloadService],
})
export class RawDownloadModule {}
