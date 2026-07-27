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
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
let NotificationsService = class NotificationsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(data) {
        try {
            return await this.prisma.appNotification.create({ data });
        }
        catch {
        }
    }
    async createForUserByName(name, payload) {
        if (!name)
            return;
        const user = await this.prisma.user.findFirst({
            where: { name: { equals: name, mode: 'insensitive' } },
        });
        if (user) {
            await this.create({ recipientId: user.id, ...payload });
        }
    }
    async createForRole(role, payload) {
        const users = await this.prisma.user.findMany({
            where: { role: role },
            select: { id: true },
        });
        await Promise.all(users.map((u) => this.create({ recipientId: u.id, ...payload })));
    }
    async findAllForUser(userId) {
        return this.prisma.appNotification.findMany({
            where: { recipientId: userId },
            orderBy: [{ isRead: 'asc' }, { createdAt: 'desc' }],
            take: 50,
        });
    }
    async countUnread(userId) {
        return this.prisma.appNotification.count({
            where: { recipientId: userId, isRead: false },
        });
    }
    async markAsRead(id, userId) {
        return this.prisma.appNotification.updateMany({
            where: { id, recipientId: userId },
            data: { isRead: true },
        });
    }
    async markAllAsRead(userId) {
        return this.prisma.appNotification.updateMany({
            where: { recipientId: userId, isRead: false },
            data: { isRead: true },
        });
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map