import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Query,
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { NewsService } from './news.service';
import { CreateNewsDto, UpdateNewsDto } from './dto/create-news.dto';
import { JwtAuthGuard } from '../../common/guard/jwt-auth.guard';
import { RolesGuard } from '../../common/guard/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { QueryNewsDto } from './dto/query-news.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';


@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  // PUBLIC: View list and detail
  @Get()
  findAll(@Query() query: QueryNewsDto) {
    return this.newsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.newsService.findOne(id);
  }

  // ADMIN ONLY: Create, Update, Delete, and Upload
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'QC', 'TL_QC')
  create(
    @Body() dto: CreateNewsDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.newsService.create({ ...dto, authorId: user.id });
  }

  @Post('upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'QC', 'TL_QC')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const fs = require('fs');
          const dir = './uploads/news';
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          cb(null, dir);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    let extractedText = '';
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      try {
        const fs = require('fs');
        const pdfLib = require('pdf-parse');
        const pdfParse = pdfLib.default || pdfLib;
        const dataBuffer = fs.readFileSync(file.path);
        const pdfData = await pdfParse(dataBuffer);
        extractedText = pdfData.text || '';
      } catch (err) {
        console.error('Failed to parse PDF content:', err);
      }
    }
    return {
      url: `/api/uploads/news/${file.filename}`,
      name: file.originalname,
      extractedText,
    };
  }

  @Patch(':id/view')
  incrementView(@Param('id') id: string) {
    return this.newsService.incrementView(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'QC', 'TL_QC')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateNewsDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.newsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'QC', 'TL_QC')
  remove(@Param('id') id: string) {
    return this.newsService.remove(id);
  }

  // ─── BOOKMARKS ───────────────────────────────────────────────────────────────

  @Post(':id/bookmark')
  @UseGuards(JwtAuthGuard)
  toggleBookmark(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.newsService.toggleBookmark(id, user.id);
  }

  @Get(':id/bookmark/status')
  @UseGuards(JwtAuthGuard)
  getBookmarkStatus(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.newsService.getBookmarkStatus(id, user.id);
  }
}
