import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateNewsDto, UpdateNewsDto } from './dto/create-news.dto';
import { QueryNewsDto } from './dto/query-news.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class NewsService {
  constructor(private prisma: PrismaService) {}

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

    return this.prisma.news.create({
      data: {
        ...dto,
        searchText,
      },
    });
  }

  async findAll(query: QueryNewsDto) {
    const { search, category, status } = query;

    const page = Number(query.page || 1);
    const limit = Number(query.limit || 10);

    // Calculate how many records to skip
    const skip = (page - 1) * limit;

    const categoryFilter = category
      ? { category: { equals: category, mode: Prisma.QueryMode.insensitive } }
      : {};

    const statusFilter = status
      ? { status: { equals: status, mode: Prisma.QueryMode.insensitive } }
      : {};

    // Build the tokenized search filter
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

    return {
      data,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }
  async findOne(id: string) {
    const news = await this.prisma.news.findFirst({
      where: { id, deletedAt: null },
    });
    if (!news) throw new NotFoundException('News article not found');
    return news;
  }

  async update(id: string, dto: UpdateNewsDto) {
    const existingNews = await this.findOne(id); // Ensure it exists and isn't deleted
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

    return this.prisma.news.update({
      where: { id },
      data: {
        ...dto,
        searchText,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.news.update({
      where: { id },
      data: { deletedAt: new Date() }, // Soft delete
    });
  }
}
