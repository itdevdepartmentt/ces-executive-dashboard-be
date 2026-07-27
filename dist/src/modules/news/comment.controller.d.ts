import { CommentService } from './comment.service';
import { CreateCommentDto, QueryCommentDto } from './dto/comment.dto';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
export declare class CommentController {
    private readonly commentService;
    constructor(commentService: CommentService);
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
    create(newsId: string, dto: CreateCommentDto, user: CurrentUserPayload): Promise<{
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
    toggleLike(commentId: string, user: CurrentUserPayload): Promise<{
        liked: boolean;
    }>;
    remove(commentId: string, user: CurrentUserPayload): Promise<{
        ok: boolean;
    }>;
}
