import { PrismaService } from '../../../prisma/prisma.service';
export declare class ActivityService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    getActivities(recipientId: string, page?: number, limit?: number): Promise<{
        data: ({
            actor: {
                id: string;
                name: string;
                email: string;
            };
            comment: {
                id: string;
                content: string;
            } | null;
            news: {
                id: string;
                title: string;
            };
        } & {
            id: string;
            type: string;
            newsId: string;
            actorId: string;
            recipientId: string;
            commentId: string | null;
            isRead: boolean;
            createdAt: Date;
        })[];
        meta: {
            total: number;
            page: number;
            lastPage: number;
        };
    }>;
    getUnreadCount(recipientId: string): Promise<{
        count: number;
    }>;
    markAllAsRead(recipientId: string): Promise<{
        ok: boolean;
    }>;
    markAsRead(activityId: string): Promise<{
        ok: boolean;
    }>;
    getMyActivity(userId: string, filter?: string, page?: number, limit?: number): Promise<{
        data: any[];
        meta: {
            total: number;
            page: number;
            lastPage: number;
        };
    }>;
}
