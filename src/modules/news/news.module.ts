import { Module } from '@nestjs/common';
import { NewsController } from './news.controller';
import { NewsService } from './news.service';
import { CommentController } from './comment.controller';
import { CommentService } from './comment.service';
import { ActivityController } from './activity.controller';
import { ActivityService } from './activity.service';

@Module({
  controllers: [ActivityController, CommentController, NewsController],
  providers: [NewsService, CommentService, ActivityService],
})
export class NewsModule {}
