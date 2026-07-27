import { PrismaService } from '../../../prisma/prisma.service';
import { CreateCommentDto, QueryCommentDto } from './dto/comment.dto';
export declare class CommentService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    findAll(newsId: string, query: QueryCommentDto): Promise<{
        data: ({
            user: {
                id: string;
                name: string;
                email: string;
                role: import("@prisma/client").$Enums.UserRole;
            };
            _count: {
                likes: number;
            };
            replies: ({
                user: {
                    id: string;
                    name: string;
                    email: string;
                    role: import("@prisma/client").$Enums.UserRole;
                };
                _count: {
                    likes: number;
                };
                likes: {
                    userId: string;
                }[];
            } & {
                id: string;
                newsId: string;
                createdAt: Date;
                updatedAt: Date;
                parentId: string | null;
                userId: string;
                content: string;
            })[];
            likes: {
                userId: string;
            }[];
        } & {
            id: string;
            newsId: string;
            createdAt: Date;
            updatedAt: Date;
            parentId: string | null;
            userId: string;
            content: string;
        })[];
        meta: {
            total: number;
            page: number;
            lastPage: number;
        };
    }>;
    create(newsId: string, userId: string, dto: CreateCommentDto): Promise<{
        user: {
            id: string;
            name: string;
            email: string;
            role: import("@prisma/client").$Enums.UserRole;
        };
        _count: {
            likes: number;
        };
        replies: {
            id: string;
            newsId: string;
            createdAt: Date;
            updatedAt: Date;
            parentId: string | null;
            userId: string;
            content: string;
        }[];
        likes: {
            userId: string;
        }[];
    } & {
        id: string;
        newsId: string;
        createdAt: Date;
        updatedAt: Date;
        parentId: string | null;
        userId: string;
        content: string;
    }>;
    toggleLike(commentId: string, userId: string): Promise<{
        liked: boolean;
    }>;
    remove(commentId: string, userId: string, userRole: string): Promise<{
        ok: boolean;
    }>;
}
