import { NotificationsService } from './notifications.service';
export declare class NotificationsController {
    private readonly notificationsService;
    constructor(notificationsService: NotificationsService);
    findAll(req: any): Promise<{
        id: string;
        type: string;
        recipientId: string;
        isRead: boolean;
        createdAt: Date;
        link: string | null;
        message: string;
        title: string;
    }[]>;
    countUnread(req: any): Promise<number>;
    markAllAsRead(req: any): Promise<import("@prisma/client").Prisma.BatchPayload>;
    markAsRead(id: string, req: any): Promise<import("@prisma/client").Prisma.BatchPayload>;
}
