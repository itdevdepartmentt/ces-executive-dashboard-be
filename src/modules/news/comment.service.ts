import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateCommentDto, QueryCommentDto } from './dto/comment.dto';

@Injectable()
export class CommentService {
  private readonly logger = new Logger(CommentService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(newsId: string, query: QueryCommentDto) {
    const page = query.page ? Number(query.page) : 1;
    const limit = query.limit ? Number(query.limit) : 20;
    const skip = (page - 1) * limit;

    // Verify article exists
    const news = await this.prisma.news.findFirst({
      where: { id: newsId, deletedAt: null },
    });
    if (!news) throw new NotFoundException('Article not found');

    const [total, data] = await Promise.all([
      this.prisma.newsComment.count({ where: { newsId, parentId: null } }),
      this.prisma.newsComment.findMany({
        where: { newsId, parentId: null },
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
          likes: { select: { userId: true } },
          _count: { select: { likes: true } },
          replies: {
            include: {
              user: {
                select: { id: true, name: true, email: true, role: true },
              },
              likes: { select: { userId: true } },
              _count: { select: { likes: true } },
            },
            orderBy: { createdAt: 'asc' }, // Replies ordered oldest first
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

  async create(newsId: string, userId: string, dto: CreateCommentDto) {
    // Verify article exists
    const news = await this.prisma.news.findFirst({
      where: { id: newsId, deletedAt: null },
      select: { id: true, authorId: true, title: true },
    });
    if (!news) throw new NotFoundException('Article not found');

    let finalParentId: string | null = null;
    let recipientIdForReply: string | null = null;

    if (dto.parentId) {
      const parent = await this.prisma.newsComment.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent || parent.newsId !== newsId) {
        throw new NotFoundException('Parent comment not found');
      }
      // Enforce 1-level deep: if parent is a reply, attach to its parent
      finalParentId = parent.parentId ? parent.parentId : parent.id;
      recipientIdForReply = parent.userId;
    }

    // Create comment
    const comment = await this.prisma.newsComment.create({
      data: {
        content: dto.content,
        newsId,
        userId,
        parentId: finalParentId,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
        likes: { select: { userId: true } },
        _count: { select: { likes: true } },
        replies: true,
      },
    });

    try {
      const notifiedIds = new Set<string>();

      if (finalParentId && recipientIdForReply && recipientIdForReply !== userId) {
        // Notification for REPLY
        await this.prisma.newsActivity.create({
          data: {
            type: 'REPLY',
            newsId,
            actorId: userId,
            recipientId: recipientIdForReply,
            commentId: comment.id,
          },
        });
        notifiedIds.add(recipientIdForReply);
      } else if (!finalParentId && news.authorId && news.authorId !== userId) {
        // Notification for COMMENT on Article
        await this.prisma.newsActivity.create({
          data: {
            type: 'COMMENT',
            newsId,
            actorId: userId,
            recipientId: news.authorId,
            commentId: comment.id,
          },
        });
        notifiedIds.add(news.authorId);
      }

      // Special feature: send notification to all QC users for ANY comment on BISA
      const qcUsers = await this.prisma.user.findMany({
        where: { role: 'QC' },
        select: { id: true },
      });
      for (const qc of qcUsers) {
        if (qc.id !== userId && !notifiedIds.has(qc.id)) {
          await this.prisma.newsActivity.create({
            data: {
              type: 'COMMENT',
              newsId,
              actorId: userId,
              recipientId: qc.id,
              commentId: comment.id,
            },
          });
          notifiedIds.add(qc.id);
        }
      }
    } catch (err) {
      this.logger.error('Failed to create activity record', err);
    }

    return comment;
  }

  async toggleLike(commentId: string, userId: string) {
    const comment = await this.prisma.newsComment.findUnique({
      where: { id: commentId },
    });
    if (!comment) throw new NotFoundException('Comment not found');

    const existingLike = await this.prisma.newsCommentLike.findUnique({
      where: {
        userId_commentId: {
          userId,
          commentId,
        },
      },
    });

    if (existingLike) {
      // Unlike
      await this.prisma.newsCommentLike.delete({
        where: { id: existingLike.id },
      });
      return { liked: false };
    } else {
      // Like
      await this.prisma.newsCommentLike.create({
        data: { userId, commentId },
      });

      // Notification
      if (comment.userId !== userId) {
        try {
          await this.prisma.newsActivity.create({
            data: {
              type: 'LIKE',
              newsId: comment.newsId,
              actorId: userId,
              recipientId: comment.userId,
              commentId: comment.id,
            },
          });
        } catch (err) {
          this.logger.error('Failed to create like activity', err);
        }
      }
      return { liked: true };
    }
  }

  async remove(commentId: string, userId: string, userRole: string) {
    const comment = await this.prisma.newsComment.findUnique({
      where: { id: commentId },
    });
    if (!comment) throw new NotFoundException('Comment not found');

    // Only comment owner or admin can delete
    if (comment.userId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException(
        'You do not have permission to delete this comment',
      );
    }

    await this.prisma.newsComment.delete({
      where: { id: commentId },
    });

    return { ok: true };
  }
}
