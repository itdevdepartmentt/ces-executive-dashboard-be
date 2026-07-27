"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var CommentService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommentService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
let CommentService = CommentService_1 = class CommentService {
    prisma;
    logger = new common_1.Logger(CommentService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(newsId, query) {
        const page = query.page ? Number(query.page) : 1;
        const limit = query.limit ? Number(query.limit) : 20;
        const skip = (page - 1) * limit;
        const news = await this.prisma.news.findFirst({
            where: { id: newsId, deletedAt: null },
        });
        if (!news)
            throw new common_1.NotFoundException('Article not found');
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
                        orderBy: { createdAt: 'asc' },
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
    async create(newsId, userId, dto) {
        const news = await this.prisma.news.findFirst({
            where: { id: newsId, deletedAt: null },
            select: { id: true, authorId: true, title: true },
        });
        if (!news)
            throw new common_1.NotFoundException('Article not found');
        let finalParentId = null;
        let recipientIdForReply = null;
        if (dto.parentId) {
            const parent = await this.prisma.newsComment.findUnique({
                where: { id: dto.parentId },
            });
            if (!parent || parent.newsId !== newsId) {
                throw new common_1.NotFoundException('Parent comment not found');
            }
            finalParentId = parent.parentId ? parent.parentId : parent.id;
            recipientIdForReply = parent.userId;
        }
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
            const notifiedIds = new Set();
            if (finalParentId && recipientIdForReply && recipientIdForReply !== userId) {
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
            }
            else if (!finalParentId && news.authorId && news.authorId !== userId) {
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
        }
        catch (err) {
            this.logger.error('Failed to create activity record', err);
        }
        return comment;
    }
    async toggleLike(commentId, userId) {
        const comment = await this.prisma.newsComment.findUnique({
            where: { id: commentId },
        });
        if (!comment)
            throw new common_1.NotFoundException('Comment not found');
        const existingLike = await this.prisma.newsCommentLike.findUnique({
            where: {
                userId_commentId: {
                    userId,
                    commentId,
                },
            },
        });
        if (existingLike) {
            await this.prisma.newsCommentLike.delete({
                where: { id: existingLike.id },
            });
            return { liked: false };
        }
        else {
            await this.prisma.newsCommentLike.create({
                data: { userId, commentId },
            });
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
                }
                catch (err) {
                    this.logger.error('Failed to create like activity', err);
                }
            }
            return { liked: true };
        }
    }
    async remove(commentId, userId, userRole) {
        const comment = await this.prisma.newsComment.findUnique({
            where: { id: commentId },
        });
        if (!comment)
            throw new common_1.NotFoundException('Comment not found');
        if (comment.userId !== userId && userRole !== 'ADMIN') {
            throw new common_1.ForbiddenException('You do not have permission to delete this comment');
        }
        await this.prisma.newsComment.delete({
            where: { id: commentId },
        });
        return { ok: true };
    }
};
exports.CommentService = CommentService;
exports.CommentService = CommentService = CommentService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CommentService);
//# sourceMappingURL=comment.service.js.map