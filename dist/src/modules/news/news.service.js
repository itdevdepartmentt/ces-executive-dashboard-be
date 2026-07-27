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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NewsService = void 0;
const common_1 = require("@nestjs/common");
const cache_manager_1 = require("@nestjs/cache-manager");
const prisma_service_1 = require("../../../prisma/prisma.service");
const client_1 = require("@prisma/client");
let NewsService = class NewsService {
    prisma;
    cacheManager;
    constructor(prisma, cacheManager) {
        this.prisma = prisma;
        this.cacheManager = cacheManager;
    }
    listCacheKey(query) {
        return `news:list:${JSON.stringify(query)}`;
    }
    detailCacheKey(id) {
        return `news:detail:${id}`;
    }
    listCacheKeys = new Set();
    async invalidateListCache() {
        const deletePromises = [...this.listCacheKeys].map((key) => this.cacheManager.del(key));
        await Promise.all(deletePromises);
        this.listCacheKeys.clear();
    }
    extractPlainText(content) {
        if (!content)
            return '';
        const traverse = (node) => {
            if (!node)
                return '';
            let text = '';
            if (typeof node.text === 'string') {
                text += `${node.text} `;
            }
            if (node.type === 'image' && node.attrs) {
                if (node.attrs.alt) {
                    text += `${node.attrs.alt} `;
                }
                if (node.attrs.title) {
                    text += `${node.attrs.title} `;
                }
                if (node.attrs.src) {
                    try {
                        const parts = node.attrs.src.split('/');
                        const filename = parts[parts.length - 1];
                        const filenameKeywords = filename.replace(/[-_.]/g, ' ');
                        text += `${filenameKeywords} `;
                    }
                    catch (e) {
                    }
                }
            }
            if (Array.isArray(node.content)) {
                for (const child of node.content) {
                    text += traverse(child);
                }
            }
            return text;
        };
        return traverse(content).trim();
    }
    async extractPdfTexts(content) {
        if (!content)
            return '';
        const pdfUrls = [];
        const findPdfUrls = (node) => {
            if (!node)
                return;
            if (Array.isArray(node.marks)) {
                for (const mark of node.marks) {
                    if (mark?.type === 'link' && typeof mark.attrs?.href === 'string') {
                        const href = mark.attrs.href.toLowerCase();
                        if (href.endsWith('.pdf')) {
                            pdfUrls.push(mark.attrs.href);
                        }
                    }
                }
            }
            if (typeof node.text === 'string') {
                const text = node.text.toLowerCase();
                if (text.includes('.pdf') && (text.startsWith('http') || text.includes('/uploads/'))) {
                    const matches = node.text.match(/https?:\/\/[^\s"]+\.pdf/gi) || node.text.match(/\/uploads\/[^\s"]+\.pdf/gi);
                    if (matches) {
                        pdfUrls.push(...matches);
                    }
                }
            }
            if (Array.isArray(node.content)) {
                for (const child of node.content) {
                    findPdfUrls(child);
                }
            }
        };
        findPdfUrls(content);
        const uniqueUrls = [...new Set(pdfUrls)];
        if (uniqueUrls.length === 0)
            return '';
        const fs = require('fs');
        const path = require('path');
        let pdfParse;
        try {
            pdfParse = require('pdf-parse');
        }
        catch (e) {
            console.error('pdf-parse dependency is missing, skipping PDF text indexing.', e);
            return '';
        }
        let allPdfTexts = '';
        for (const url of uniqueUrls) {
            try {
                const parts = url.split('/');
                const filename = parts[parts.length - 1];
                const localPath = path.join(process.cwd(), 'uploads', 'news', filename);
                if (fs.existsSync(localPath)) {
                    const dataBuffer = fs.readFileSync(localPath);
                    const pdfData = await pdfParse(dataBuffer);
                    if (pdfData && pdfData.text) {
                        allPdfTexts += ` ${pdfData.text}`;
                    }
                }
                else {
                    console.warn(`PDF file not found locally: ${localPath}`);
                }
            }
            catch (err) {
                console.error(`Failed to parse PDF from URL: ${url}`, err);
            }
        }
        return allPdfTexts.trim();
    }
    async create(dto) {
        const pdfTexts = await this.extractPdfTexts(dto.content);
        const searchText = [
            dto.title,
            dto.summary,
            this.extractPlainText(dto.content),
            pdfTexts,
        ]
            .filter(Boolean)
            .join(' ');
        const news = await this.prisma.news.create({
            data: { ...dto, searchText },
        });
        await this.invalidateListCache();
        return news;
    }
    async findAll(query) {
        const cacheKey = this.listCacheKey(query);
        const cached = await this.cacheManager.get(cacheKey);
        if (cached) {
            return cached;
        }
        const { search, category, status } = query;
        const page = Number(query.page || 1);
        const limit = Number(query.limit || 10);
        const skip = (page - 1) * limit;
        const categoryFilter = category
            ? { category: { equals: category, mode: client_1.Prisma.QueryMode.insensitive } }
            : {};
        const statusFilter = status
            ? { status: { equals: status, mode: client_1.Prisma.QueryMode.insensitive } }
            : {};
        let searchFilter = {};
        if (search && search.trim()) {
            const terms = search.trim().split(/\s+/).filter(Boolean);
            if (terms.length > 0) {
                searchFilter = {
                    AND: terms.map((term) => ({
                        OR: [
                            { title: { contains: term, mode: client_1.Prisma.QueryMode.insensitive } },
                            { summary: { contains: term, mode: client_1.Prisma.QueryMode.insensitive } },
                            { searchText: { contains: term, mode: client_1.Prisma.QueryMode.insensitive } },
                        ],
                    })),
                };
            }
        }
        const where = {
            deletedAt: null,
            ...categoryFilter,
            ...statusFilter,
            ...searchFilter,
        };
        const [total, data] = await Promise.all([
            this.prisma.news.count({ where }),
            this.prisma.news.findMany({
                where,
                skip,
                take: limit,
                orderBy: { updatedAt: 'desc' },
            }),
        ]);
        const result = {
            data,
            meta: {
                total,
                page,
                lastPage: Math.ceil(total / limit),
            },
        };
        await this.cacheManager.set(cacheKey, result, 60_000);
        this.listCacheKeys.add(cacheKey);
        return result;
    }
    async findOne(id) {
        const cacheKey = this.detailCacheKey(id);
        const cached = await this.cacheManager.get(cacheKey);
        if (cached) {
            return cached;
        }
        const news = await this.prisma.news.findFirst({
            where: { id, deletedAt: null },
        });
        if (!news)
            throw new common_1.NotFoundException('News article not found');
        await this.cacheManager.set(cacheKey, news, 2 * 60_000);
        return news;
    }
    async incrementView(id) {
        try {
            await this.prisma.$executeRaw `UPDATE "News" SET "viewCount" = "viewCount" + 1 WHERE id = ${id}`;
            await this.cacheManager.del(this.detailCacheKey(id));
        }
        catch (e) {
        }
        return { ok: true };
    }
    async update(id, dto) {
        const existingNews = await this.prisma.news.findFirst({
            where: { id, deletedAt: null },
        });
        if (!existingNews)
            throw new common_1.NotFoundException('News article not found');
        const contentToParse = dto.content ?? existingNews.content;
        const pdfTexts = await this.extractPdfTexts(contentToParse);
        const searchText = [
            dto.title ?? existingNews.title,
            dto.summary ?? existingNews.summary,
            this.extractPlainText(contentToParse),
            pdfTexts,
        ]
            .filter(Boolean)
            .join(' ');
        const updated = await this.prisma.news.update({
            where: { id },
            data: { ...dto, searchText },
        });
        await this.cacheManager.del(this.detailCacheKey(id));
        await this.invalidateListCache();
        return updated;
    }
    async remove(id) {
        await this.findOne(id);
        const removed = await this.prisma.news.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
        await this.cacheManager.del(this.detailCacheKey(id));
        await this.invalidateListCache();
        return removed;
    }
    async toggleBookmark(newsId, userId) {
        const news = await this.prisma.news.findFirst({
            where: { id: newsId, deletedAt: null },
        });
        if (!news)
            throw new common_1.NotFoundException('News article not found');
        const existingBookmark = await this.prisma.newsBookmark.findUnique({
            where: { userId_newsId: { userId, newsId } },
        });
        if (existingBookmark) {
            await this.prisma.newsBookmark.delete({
                where: { id: existingBookmark.id },
            });
            return { isBookmarked: false };
        }
        else {
            await this.prisma.newsBookmark.create({
                data: { userId, newsId },
            });
            return { isBookmarked: true };
        }
    }
    async getBookmarkStatus(newsId, userId) {
        const existingBookmark = await this.prisma.newsBookmark.findUnique({
            where: { userId_newsId: { userId, newsId } },
        });
        return { isBookmarked: !!existingBookmark };
    }
};
exports.NewsService = NewsService;
exports.NewsService = NewsService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(cache_manager_1.CACHE_MANAGER)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, Object])
], NewsService);
//# sourceMappingURL=news.service.js.map