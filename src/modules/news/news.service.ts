import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateNewsDto, UpdateNewsDto } from './dto/create-news.dto';
import { QueryNewsDto } from './dto/query-news.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class NewsService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  // ─── Cache key helpers ───────────────────────────────────────────────────────
  private listCacheKey(query: QueryNewsDto): string {
    return `news:list:${JSON.stringify(query)}`;
  }

  private detailCacheKey(id: string): string {
    return `news:detail:${id}`;
  }

  // Track list cache keys agar bisa diinvalidasi satu per satu
  private listCacheKeys = new Set<string>();

  /** Invalidasi semua cache list news */
  private async invalidateListCache(): Promise<void> {
    const deletePromises = [...this.listCacheKeys].map((key) =>
      this.cacheManager.del(key),
    );
    await Promise.all(deletePromises);
    this.listCacheKeys.clear();
  }

  // ─── Text extraction helpers ─────────────────────────────────────────────────
  private extractPlainText(content: any): string {
    if (!content) return '';

    const traverse = (node: any): string => {
      if (!node) return '';
      let text = '';
      if (typeof node.text === 'string') {
        text += `${node.text} `;
      }
      // Index image alt, title, and filename
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
            // Replace hyphens, underscores, dots, etc. with spaces to index keywords
            const filenameKeywords = filename.replace(/[-_.]/g, ' ');
            text += `${filenameKeywords} `;
          } catch (e) {
            // Safe fallback
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

  private async extractPdfTexts(content: any): Promise<string> {
    if (!content) return '';

    const pdfUrls: string[] = [];

    // Helper to recursively find PDF URLs
    const findPdfUrls = (node: any) => {
      if (!node) return;

      // Check marks for link hrefs
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

      // Check if node is raw text containing a pdf link
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
    if (uniqueUrls.length === 0) return '';

    const fs = require('fs');
    const path = require('path');
    let pdfParse;
    try {
      pdfParse = require('pdf-parse');
    } catch (e) {
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
        } else {
          console.warn(`PDF file not found locally: ${localPath}`);
        }
      } catch (err) {
        console.error(`Failed to parse PDF from URL: ${url}`, err);
      }
    }

    return allPdfTexts.trim();
  }

  // ─── CRUD ────────────────────────────────────────────────────────────────────

  async create(dto: CreateNewsDto) {
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

    // Invalidasi semua cache list setelah create
    await this.invalidateListCache();

    return news;
  }

  async findAll(query: QueryNewsDto) {
    const cacheKey = this.listCacheKey(query);

    // Cek cache terlebih dahulu
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    const { search, category, status } = query;
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 10);
    const skip = (page - 1) * limit;

    const categoryFilter = category
      ? { category: { equals: category, mode: Prisma.QueryMode.insensitive } }
      : {};

    const statusFilter = status
      ? { status: { equals: status, mode: Prisma.QueryMode.insensitive } }
      : {};

    let searchFilter: Prisma.NewsWhereInput = {};
    if (search && search.trim()) {
      const terms = search.trim().split(/\s+/).filter(Boolean);
      if (terms.length > 0) {
        searchFilter = {
          AND: terms.map((term) => ({
            OR: [
              { title: { contains: term, mode: Prisma.QueryMode.insensitive } },
              { summary: { contains: term, mode: Prisma.QueryMode.insensitive } },
              { searchText: { contains: term, mode: Prisma.QueryMode.insensitive } },
            ],
          })),
        };
      }
    }

    const where: Prisma.NewsWhereInput = {
      deletedAt: null,
      ...categoryFilter,
      ...statusFilter,
      ...searchFilter,
    };

    // Execute both count and data fetch in parallel for better performance
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

    // Simpan ke cache selama 60 detik
    await this.cacheManager.set(cacheKey, result, 60_000);
    this.listCacheKeys.add(cacheKey);

    return result;
  }

  async findOne(id: string) {
    const cacheKey = this.detailCacheKey(id);

    // Cek cache terlebih dahulu
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    const news = await this.prisma.news.findFirst({
      where: { id, deletedAt: null },
    });
    if (!news) throw new NotFoundException('News article not found');

    // Simpan ke cache selama 2 menit
    await this.cacheManager.set(cacheKey, news, 2 * 60_000);

    return news;
  }

  async incrementView(id: string) {
    // Increment the view count atomically, ignore if article doesn't exist
    try {
      await this.prisma.news.update({
        where: { id },
        data: { viewCount: { increment: 1 } },
      });
      // Invalidasi cache detail agar viewCount terbaru tampil
      await this.cacheManager.del(this.detailCacheKey(id));
    } catch (e) {
      // Article may not exist, silently ignore
    }
    return { ok: true };
  }

  async update(id: string, dto: UpdateNewsDto) {
    const existingNews = await this.prisma.news.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existingNews) throw new NotFoundException('News article not found');

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

    // Invalidasi cache detail dan semua list
    await this.cacheManager.del(this.detailCacheKey(id));
    await this.invalidateListCache();

    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);
    const removed = await this.prisma.news.update({
      where: { id },
      data: { deletedAt: new Date() }, // Soft delete
    });

    // Invalidasi cache detail dan semua list
    await this.cacheManager.del(this.detailCacheKey(id));
    await this.invalidateListCache();

    return removed;
  }
}
