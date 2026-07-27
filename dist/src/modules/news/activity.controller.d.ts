import { ActivityService } from './activity.service';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
export declare class ActivityController {
    private readonly activityService;
    constructor(activityService: ActivityService);
    getActivities(user: CurrentUserPayload, page?: string, limit?: string): Promise<{
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
    getUnreadCount(user: CurrentUserPayload): Promise<{
        count: number;
    }>;
    testMe(): Promise<{
        data: any[];
        meta: {
            total: number;
            page: number;
            lastPage: number;
        };
    }>;
    getMyActivity(user: CurrentUserPayload, filter?: string, page?: string, limit?: string): Promise<{
        data: any[];
        meta: {
            total: number;
            page: number;
            lastPage: number;
        };
    }>;
    markAllAsRead(user: CurrentUserPayload): Promise<{
        ok: boolean;
    }>;
    markAsRead(id: string): Promise<{
        ok: boolean;
    }>;
}
