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
var ActivityService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
let ActivityService = ActivityService_1 = class ActivityService {
    prisma;
    logger = new common_1.Logger(ActivityService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getActivities(recipientId, page = 1, limit = 20) {
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
    async getUnreadCount(recipientId) {
        const count = await this.prisma.newsActivity.count({
            where: { recipientId, isRead: false },
        });
        return { count };
    }
    async markAllAsRead(recipientId) {
        await this.prisma.newsActivity.updateMany({
            where: { recipientId, isRead: false },
            data: { isRead: true },
        });
        return { ok: true };
    }
    async markAsRead(activityId) {
        await this.prisma.newsActivity.update({
            where: { id: activityId },
            data: { isRead: true },
        });
        return { ok: true };
    }
    async getMyActivity(userId, filter = 'ALL', page = 1, limit = 20) {
        const allActivities = [];
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
        allActivities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
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
};
exports.ActivityService = ActivityService;
exports.ActivityService = ActivityService = ActivityService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ActivityService);
//# sourceMappingURL=activity.service.js.map