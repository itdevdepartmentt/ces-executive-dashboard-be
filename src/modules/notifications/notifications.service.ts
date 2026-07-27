import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a notification for one recipient
   */
  async create(data: {
    recipientId: string;
    type: string;
    title: string;
    message: string;
    link?: string;
  }) {
    try {
      return await this.prisma.appNotification.create({ data });
    } catch {
      // Silently fail — notifications should never block main flow
    }
  }

  /**
   * Find user by name (case-insensitive) and create notification
   */
  async createForUserByName(
    name: string,
    payload: { type: string; title: string; message: string; link?: string },
  ) {
    if (!name) return;
    const user = await this.prisma.user.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });
    if (user) {
      await this.create({ recipientId: user.id, ...payload });
    }
  }

  /**
   * Create notifications for all users matching a specific role
   */
  async createForRole(
    role: string,
    payload: { type: string; title: string; message: string; link?: string },
  ) {
    const users = await this.prisma.user.findMany({
      where: { role: role as any },
      select: { id: true },
    });
    await Promise.all(
      users.map((u) => this.create({ recipientId: u.id, ...payload })),
    );
  }

  /**
   * Get all notifications for a user (unread first, max 50)
   */
  async findAllForUser(userId: string) {
    return this.prisma.appNotification.findMany({
      where: { recipientId: userId },
      orderBy: [{ isRead: 'asc' }, { createdAt: 'desc' }],
      take: 50,
    });
  }

  /**
   * Count unread notifications for a user
   */
  async countUnread(userId: string) {
    return this.prisma.appNotification.count({
      where: { recipientId: userId, isRead: false },
    });
  }

  /**
   * Mark a single notification as read
   */
  async markAsRead(id: string, userId: string) {
    return this.prisma.appNotification.updateMany({
      where: { id, recipientId: userId },
      data: { isRead: true },
    });
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string) {
    return this.prisma.appNotification.updateMany({
      where: { recipientId: userId, isRead: false },
      data: { isRead: true },
    });
  }
}
