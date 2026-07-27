import type { Cache } from 'cache-manager';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateNewsDto, UpdateNewsDto } from './dto/create-news.dto';
import { QueryNewsDto } from './dto/query-news.dto';
import { Prisma } from '@prisma/client';
export declare class NewsService {
    private prisma;
    private cacheManager;
    constructor(prisma: PrismaService, cacheManager: Cache);
    private listCacheKey;
    private detailCacheKey;
    private listCacheKeys;
    private invalidateListCache;
    private extractPlainText;
    private extractPdfTexts;
    create(dto: CreateNewsDto): Promise<{
        id: string;
        createdAt: Date;
        status: string;
        updatedAt: Date;
        category: string | null;
        summary: string | null;
        title: string;
        content: Prisma.JsonValue;
        authorName: string;
        authorId: string | null;
        deletedAt: Date | null;
        searchText: string | null;
        viewCount: number;
    }>;
    findAll(query: QueryNewsDto): Promise<{}>;
    findOne(id: string): Promise<{}>;
    incrementView(id: string): Promise<{
        ok: boolean;
    }>;
    update(id: string, dto: UpdateNewsDto): Promise<{
        id: string;
        createdAt: Date;
        status: string;
        updatedAt: Date;
        category: string | null;
        summary: string | null;
        title: string;
        content: Prisma.JsonValue;
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
        content: Prisma.JsonValue;
        authorName: string;
        authorId: string | null;
        deletedAt: Date | null;
        searchText: string | null;
        viewCount: number;
    }>;
    toggleBookmark(newsId: string, userId: string): Promise<{
        isBookmarked: boolean;
    }>;
    getBookmarkStatus(newsId: string, userId: string): Promise<{
        isBookmarked: boolean;
    }>;
}
