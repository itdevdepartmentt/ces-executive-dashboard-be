import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get activity feed for a specific admin user (recipient).
   * Returns activities sorted newest-first with actor + news info.
   */
  async getActivities(recipientId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      this.prisma.newsActivity.count({ where: { recipientId } }),
      this.prisma.newsActivity.findMany({
        where: { recipientId },
        include: {
          actor: {
            select: { id: true, name: true, email: true },
          },
          news: {
            select: { id: true, title: true },
          },
          comment: {
            select: { id: true, content: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get the count of unread activities for the bell badge.
   */
  async getUnreadCount(recipientId: string): Promise<{ count: number }> {
    const count = await this.prisma.newsActivity.count({
      where: { recipientId, isRead: false },
    });
    return { count };
  }

  /**
   * Mark all activities as read for a specific admin user.
   */
  async markAllAsRead(recipientId: string) {
    await this.prisma.newsActivity.updateMany({
      where: { recipientId, isRead: false },
      data: { isRead: true },
    });
    return { ok: true };
  }

  /**
   * Mark a single activity as read.
   */
  async markAsRead(activityId: string) {
    await this.prisma.newsActivity.update({
      where: { id: activityId },
      data: { isRead: true },
    });
    return { ok: true };
  }

  /**
   * Get user's own activities (bookmarks, comments, likes)
   */
  async getMyActivity(userId: string, filter: string = 'ALL', page = 1, limit = 20) {
    const allActivities: any[] = [];

    // Bookmarks
    if (filter === 'ALL' || filter === 'BOOKMARKS') {
      const bookmarks = await this.prisma.newsBookmark.findMany({
        where: { userId },
        include: { news: { select: { id: true, title: true } } },
      });
      bookmarks.forEach((b) => {
        allActivities.push({
          id: b.id,
          type: 'BOOKMARK',
          newsId: b.newsId,
          newsTitle: b.news.title,
          createdAt: b.createdAt,
        });
      });
    }

    // Comments & Replies (from other users to this user)
    if (filter === 'ALL' || filter === 'COMMENTS') {
      const activities = await this.prisma.newsActivity.findMany({
        where: { recipientId: userId, type: { in: ['COMMENT', 'REPLY'] } },
        include: {
          actor: { select: { id: true, name: true } },
          news: { select: { id: true, title: true } },
          comment: { select: { id: true, content: true } }
        },
      });
      activities.forEach((a) => {
        allActivities.push({
          id: a.id,
          type: a.type,
          newsId: a.newsId,
          newsTitle: a.news.title,
          content: a.comment?.content,
          actorName: a.actor.name,
          createdAt: a.createdAt,
        });
      });
    }

    // Likes (from other users to this user's comments)
    if (filter === 'ALL' || filter === 'LIKES') {
      const activities = await this.prisma.newsActivity.findMany({
        where: { recipientId: userId, type: 'LIKE' },
        include: {
          actor: { select: { id: true, name: true } },
          news: { select: { id: true, title: true } },
          comment: { select: { id: true, content: true } }
        },
      });
      activities.forEach((a) => {
        allActivities.push({
          id: a.id,
          type: a.type,
          newsId: a.newsId,
          newsTitle: a.news.title,
          content: a.comment?.content,
          actorName: a.actor.name,
          createdAt: a.createdAt,
        });
      });
    }

    // Sort descending
    allActivities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Pagination
    const total = allActivities.length;
    const skip = (page - 1) * limit;
    const data = allActivities.slice(skip, skip + limit);

    return {
      data,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }
}
