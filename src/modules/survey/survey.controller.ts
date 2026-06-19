import { Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseIntPipe, UseGuards, Res } from '@nestjs/common';
import type { Response } from 'express';
import { SurveyService } from './survey.service';
import { CreateSurveyFieldDto } from './dto/create-survey-field.dto';
import { UpdateSurveyFieldDto } from './dto/update-survey-field.dto';
import { SubmitSurveyDto } from './dto/submit-survey.dto';
import { QuerySurveyDto } from './dto/query-survey.dto';
import { JwtAuthGuard } from '../../common/guard/jwt-auth.guard';
import { RolesGuard } from '../../common/guard/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('survey')
export class SurveyController {
  constructor(private readonly service: SurveyService) {}

  // ─── Public Endpoints (No Auth) ───
  @Get('fields')
  getActiveFields() {
    return this.service.getActiveFields();
  }

  @Get('check/:ticketId')
  checkSubmission(@Param('ticketId') ticketId: string) {
    return this.service.checkSubmission(ticketId);
  }

  @Get('check-agent/:ticketId')
  checkAgentByTicketId(@Param('ticketId') ticketId: string) {
    return this.service.checkAgentByTicketId(ticketId);
  }

  @Post('responses')
  submitResponse(@Body() dto: SubmitSurveyDto) {
    return this.service.submitResponse(dto);
  }

  // ─── Admin Endpoints (Auth + ADMIN Role) ───
  @Post('admin/generate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  generateLink(@Body() body: { ticketId: string }) {
    // Force reload
    return this.service.generateLink(body.ticketId);
  }
  @Get('admin/fields')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  getAllFields(@Query() query: QuerySurveyDto) {
    return this.service.getAllFields(query);
  }

  @Post('admin/fields')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  createField(@Body() dto: CreateSurveyFieldDto) {
    return this.service.createField(dto);
  }

  @Patch('admin/fields/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  updateField(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSurveyFieldDto) {
    return this.service.updateField(id, dto);
  }

  @Delete('admin/fields/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  deleteField(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteField(id);
  }

  @Get('admin/responses')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  getResponses(@Query() query: QuerySurveyDto) {
    return this.service.getResponses(query);
  }

  @Get('admin/responses/download')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  downloadResponses(@Res() res: Response) {
    return this.service.downloadResponses(res);
  }
}
