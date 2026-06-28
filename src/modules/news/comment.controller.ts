import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommentService } from './comment.service';
import { CreateCommentDto, QueryCommentDto } from './dto/comment.dto';
import { JwtAuthGuard } from '../../common/guard/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';

@Controller('news/:newsId/comments')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  // PUBLIC: List comments for an article
  @Get()
  findAll(
    @Param('newsId') newsId: string,
    @Query() query: QueryCommentDto,
  ) {
    return this.commentService.findAll(newsId, query);
  }

  // LOGIN REQUIRED: Post a comment
  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Param('newsId') newsId: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.commentService.create(newsId, user.id, dto);
  }

  // LOGIN REQUIRED: Toggle like on a comment
  @Post(':commentId/like')
  @UseGuards(JwtAuthGuard)
  toggleLike(
    @Param('commentId') commentId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.commentService.toggleLike(commentId, user.id);
  }

  // OWNER / ADMIN: Delete a comment
  @Delete(':commentId')
  @UseGuards(JwtAuthGuard)
  remove(
    @Param('commentId') commentId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.commentService.remove(commentId, user.id, user.role);
  }
}
