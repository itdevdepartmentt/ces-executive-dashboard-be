import { NewsService } from './news.service';
import { CreateNewsDto, UpdateNewsDto } from './dto/create-news.dto';
import { QueryNewsDto } from './dto/query-news.dto';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
export declare class NewsController {
    private readonly newsService;
    constructor(newsService: NewsService);
    findAll(query: QueryNewsDto): Promise<{}>;
    findOne(id: string): Promise<{}>;
    create(dto: CreateNewsDto, user: CurrentUserPayload): Promise<{
        id: string;
        createdAt: Date;
        status: string;
        updatedAt: Date;
        category: string | null;
        summary: string | null;
        title: string;
        content: import("@prisma/client/runtime/library").JsonValue;
        authorName: string;
        authorId: string | null;
        deletedAt: Date | null;
        searchText: string | null;
        viewCount: number;
    }>;
    uploadFile(file: Express.Multer.File): Promise<{
        url: string;
        name: string;
        extractedText: string;
    }>;
    incrementView(id: string): Promise<{
        ok: boolean;
    }>;
    update(id: string, dto: UpdateNewsDto, user: CurrentUserPayload): Promise<{
        id: string;
        createdAt: Date;
        status: string;
        updatedAt: Date;
        category: string | null;
        summary: string | null;
        title: string;
        content: import("@prisma/client/runtime/library").JsonValue;
        authorName: string;
        authorId: string | null;
        deletedAt: Date | null;
        searchText: string | null;
        viewCount: number;
    }>;
    remove(id: string): Promise<{
        id: string;
        createdAt: Date;
        status: string;
        updatedAt: Date;
        category: string | null;
        summary: string | null;
        title: string;
        content: import("@prisma/client/runtime/library").JsonValue;
        authorName: string;
        authorId: string | null;
        deletedAt: Date | null;
        searchText: string | null;
        viewCount: number;
    }>;
    toggleBookmark(id: string, user: CurrentUserPayload): Promise<{
        isBookmarked: boolean;
    }>;
    getBookmarkStatus(id: string, user: CurrentUserPayload): Promise<{
        isBookmarked: boolean;
    }>;
}
