import { PrismaService } from '../../../prisma/prisma.service';
export declare class NotificationsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(data: {
        recipientId: string;
        type: string;
        title: string;
        message: string;
        link?: string;
    }): Promise<{
        id: string;
        type: string;
        recipientId: string;
        isRead: boolean;
        createdAt: Date;
        link: string | null;
        message: string;
        title: string;
    } | undefined>;
    createForUserByName(name: string, payload: {
        type: string;
        title: string;
        message: string;
        link?: string;
    }): Promise<void>;
    createForRole(role: string, payload: {
        type: string;
        title: string;
        message: string;
        link?: string;
    }): Promise<void>;
    findAllForUser(userId: string): Promise<{
        id: string;
        type: string;
        recipientId: string;
        isRead: boolean;
        createdAt: Date;
        link: string | null;
        message: string;
        title: string;
    }[]>;
    countUnread(userId: string): Promise<number>;
    markAsRead(id: string, userId: string): Promise<import("@prisma/client").Prisma.BatchPayload>;
    markAllAsRead(userId: string): Promise<import("@prisma/client").Prisma.BatchPayload>;
}
