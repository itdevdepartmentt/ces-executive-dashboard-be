import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UserRole } from '@prisma/client';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/roles.guard';
import {
  CreateProcessStepDto,
  CreateStaffDto,
  MarkWorkedDto,
  QueryTicketsDto,
  SaveRecapDto,
  UpdateAgentDto,
  UpdateProcessStepDto,
  UpdateStaffDto,
  UploadTicketsDto,
} from './dto/mass-process.dto';
import { MassExcelService } from './mass-excel.service';
import { MassProcessService } from './mass-process.service';

const READERS = [
  UserRole.ADMIN,
  UserRole.QC,
  UserRole.TL_QC,
  UserRole.TL,
  UserRole.USER,
] as const;

const WRITERS = [UserRole.ADMIN, UserRole.QC, UserRole.TL_QC, UserRole.TL] as const;

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('mass-process')
export class MassProcessController {
  constructor(
    private readonly service: MassProcessService,
    private readonly excel: MassExcelService,
  ) {}

  // -------------------------------------------------------------- dashboard

  @Get('dashboard')
  @Roles(...READERS)
  dashboard() {
    return this.service.getDashboard();
  }

  @Get('daily-activity')
  @Roles(...READERS)
  dailyActivity(@Query('date') date?: string) {
    return this.service.getDailyActivity(date);
  }

  // --------------------------------------------------------- langkah proses

  @Get('process-steps')
  @Roles(...READERS)
  listSteps(@Query('includeInactive') includeInactive?: string) {
    return this.service.listProcessSteps(includeInactive === 'true');
  }

  @Post('process-steps')
  @Roles(UserRole.ADMIN, UserRole.TL_QC)
  createStep(@Body() dto: CreateProcessStepDto) {
    return this.service.createProcessStep(dto);
  }

  @Patch('process-steps/:id')
  @Roles(UserRole.ADMIN, UserRole.TL_QC)
  updateStep(@Param('id') id: string, @Body() dto: UpdateProcessStepDto) {
    return this.service.updateProcessStep(id, dto);
  }

  @Delete('process-steps/:id')
  @Roles(UserRole.ADMIN, UserRole.TL_QC)
  deleteStep(@Param('id') id: string) {
    return this.service.deleteProcessStep(id);
  }

  // -------------------------------------------------------------- daftar staf

  @Get('staff')
  @Roles(...READERS)
  listStaff(
    @Query('role') role?: 'AGENT' | 'TEAM_LEADER',
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.service.listStaff(role, includeInactive === 'true');
  }

  @Post('staff')
  @Roles(UserRole.ADMIN, UserRole.TL_QC)
  createStaff(@Body() dto: CreateStaffDto) {
    return this.service.createStaff(dto);
  }

  @Patch('staff/:id')
  @Roles(UserRole.ADMIN, UserRole.TL_QC)
  updateStaff(@Param('id') id: string, @Body() dto: UpdateStaffDto) {
    return this.service.updateStaff(id, dto);
  }

  @Delete('staff/:id')
  @Roles(UserRole.ADMIN, UserRole.TL_QC)
  deleteStaff(@Param('id') id: string) {
    return this.service.deleteStaff(id);
  }

  // ------------------------------------------------------------------ tiket

  @Post('upload')
  @Roles(...WRITERS)
  upload(@Body() dto: UploadTicketsDto) {
    return this.service.uploadTickets(dto);
  }

  /**
   * Upload berkas .xlsx langsung. Berkas ditahan di memori, tidak ditulis ke
   * disk — isinya hanya dibaca sekali lalu dibuang.
   */
  @Post('upload-excel')
  @Roles(...WRITERS)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  )
  async uploadExcel(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Berkas belum dipilih.');

    const parsed = await this.excel.parse(file.buffer);
    if (parsed.rows.length === 0) {
      throw new BadRequestException(
        'Tidak ada baris yang bisa dipakai dari berkas ini.',
      );
    }

    const result = await this.service.uploadTickets({ rows: parsed.rows });

    return {
      ...result,
      fileName: file.originalname,
      totalRows: parsed.totalRows,
      unmappedColumns: parsed.unmappedColumns,
      skippedRows: parsed.skipped,
    };
  }

  @Post('recalculate')
  @Roles(...WRITERS)
  recalculateAll() {
    return this.service.recalculateAllOpen();
  }

  @Get('tickets')
  @Roles(...READERS)
  listTickets(@Query() query: QueryTicketsDto) {
    return this.service.listTickets(query);
  }

  @Get('tickets/:ticketNumber')
  @Roles(...READERS)
  getTicket(@Param('ticketNumber') ticketNumber: string) {
    return this.service.getTicket(ticketNumber);
  }

  @Patch('tickets/:ticketNumber')
  @Roles(...WRITERS)
  saveRecap(
    @Param('ticketNumber') ticketNumber: string,
    @Body() dto: SaveRecapDto,
    @Req() req: { user?: { email?: string; sub?: string } },
  ) {
    return this.service.saveRecap(ticketNumber, dto, req.user?.email ?? req.user?.sub);
  }

  @Patch('tickets/:ticketNumber/agent')
  @Roles(...WRITERS)
  updateAgent(
    @Param('ticketNumber') ticketNumber: string,
    @Body() dto: UpdateAgentDto,
    @Req() req: { user?: { email?: string; sub?: string } },
  ) {
    return this.service.updateAgent(ticketNumber, dto, req.user?.email ?? req.user?.sub);
  }

  @Post('tickets/:ticketNumber/worked')
  @Roles(...WRITERS)
  markWorked(
    @Param('ticketNumber') ticketNumber: string,
    @Body() dto: MarkWorkedDto,
  ) {
    return this.service.markWorked(ticketNumber, dto);
  }
}
