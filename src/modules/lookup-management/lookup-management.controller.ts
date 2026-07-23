import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { LookupManagementService } from './lookup-management.service';
import {
  CreateAccountMappingDto,
  UpdateAccountMappingDto,
  CreateLookupKIPDto,
  UpdateLookupKIPDto,
  CreateLookupAgentDto,
  UpdateLookupAgentDto,
  QueryLookupDto,
} from './dto/lookup-management.dto';
import { JwtAuthGuard } from '../../common/guard/jwt-auth.guard';
import { RolesGuard } from '../../common/guard/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('lookup-management')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'QC', 'TL_QC', 'TL')
export class LookupManagementController {
  constructor(private readonly service: LookupManagementService) {}

  @Post(':lookupType/upload-csv')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: (_req, file, cb) => {
        const isCsvMime =
          file.mimetype === 'text/csv' ||
          file.mimetype === 'application/csv' ||
          file.mimetype === 'application/vnd.ms-excel';
        const isCsvExt = file.originalname?.toLowerCase().endsWith('.csv');

        if (!isCsvMime && !isCsvExt) {
          return cb(
            new BadRequestException('Only CSV files are allowed for bulk upload'),
            false,
          );
        }

        return cb(null, true);
      },
    }),
  )
  uploadLookupCsv(
    @Param('lookupType') lookupType: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.bulkUploadFromCsv(lookupType, file);
  }

  // ─── AccountMapping ───────────────────────
  @Get('account-mapping')
  findAllAccountMappings(@Query() query: QueryLookupDto) {
    return this.service.findAllAccountMappings(query);
  }

  @Post('account-mapping')
  createAccountMapping(@Body() dto: CreateAccountMappingDto) {
    return this.service.createAccountMapping(dto);
  }

  @Patch('account-mapping/:id')
  updateAccountMapping(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAccountMappingDto,
  ) {
    return this.service.updateAccountMapping(id, dto);
  }

  @Delete('account-mapping/:id')
  deleteAccountMapping(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteAccountMapping(id);
  }

  @Delete('account-mapping')
  deleteAllAccountMappings() {
    return this.service.deleteAllAccountMappings();
  }

  // ─── LookupKIP ────────────────────────────
  @Get('lookup-kip')
  findAllLookupKIP(@Query() query: QueryLookupDto) {
    return this.service.findAllLookupKIP(query);
  }

  @Post('lookup-kip')
  createLookupKIP(@Body() dto: CreateLookupKIPDto) {
    return this.service.createLookupKIP(dto);
  }

  @Patch('lookup-kip/:id')
  updateLookupKIP(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLookupKIPDto,
  ) {
    return this.service.updateLookupKIP(id, dto);
  }

  @Delete('lookup-kip/:id')
  deleteLookupKIP(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteLookupKIP(id);
  }

  @Delete('lookup-kip')
  deleteAllLookupKIP() {
    return this.service.deleteAllLookupKIP();
  }

  // ─── LookupAgent ──────────────────────────
  @Get('lookup-agent')
  findAllLookupAgent(@Query() query: QueryLookupDto) {
    return this.service.findAllLookupAgent(query);
  }

  @Post('lookup-agent')
  createLookupAgent(@Body() dto: CreateLookupAgentDto) {
    return this.service.createLookupAgent(dto);
  }

  @Patch('lookup-agent/:id')
  updateLookupAgent(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLookupAgentDto,
  ) {
    return this.service.updateLookupAgent(id, dto);
  }

  @Delete('lookup-agent/:id')
  deleteLookupAgent(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteLookupAgent(id);
  }

  @Delete('lookup-agent')
  deleteAllLookupAgent() {
    return this.service.deleteAllLookupAgent();
  }
}
