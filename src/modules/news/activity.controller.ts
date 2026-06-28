import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ActivityService } from './activity.service';
import { JwtAuthGuard } from '../../common/guard/jwt-auth.guard';
import { RolesGuard } from '../../common/guard/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';

@Controller('news/activity')
@UseGuards(JwtAuthGuard)
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  // GET /news/activity?page=1&limit=20
  @Get()
  getActivities(
    @CurrentUser() user: CurrentUserPayload,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.activityService.getActivities(
      user.id,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  // GET /news/activity/unread-count
  @Get('unread-count')
  getUnreadCount(@CurrentUser() user: CurrentUserPayload) {
    return this.activityService.getUnreadCount(user.id);
  }

  @Get('test-me')
  testMe() {
    return this.activityService.getMyActivity('ae959d83-25f4-46a9-94e1-83fdeaaf5344', 'BOOKMARKS');
  }

  // GET /news/activity/me (User's own activity: bookmarks, comments, likes)
  @Get('me')
  getMyActivity(
    @CurrentUser() user: CurrentUserPayload,
    @Query('filter') filter?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.activityService.getMyActivity(
      user.id,
      filter || 'ALL',
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  // PATCH /news/activity/read  (mark ALL as read)
  @Patch('read')
  markAllAsRead(@CurrentUser() user: CurrentUserPayload) {
    return this.activityService.markAllAsRead(user.id);
  }

  // PATCH /news/activity/:id/read  (mark single as read)
  @Patch(':id/read')
  markAsRead(@Param('id') id: string) {
    return this.activityService.markAsRead(id);
  }
}
