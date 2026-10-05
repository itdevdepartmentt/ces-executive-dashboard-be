import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class UploadTicketRowDto {
  @IsString()
  @IsNotEmpty()
  ticketNumber: string;

  @IsOptional() @IsString() ticketSubject?: string;
  @IsOptional() @IsString() lastStatus?: string;
  @IsOptional() @IsString() ticketCreated?: string;
  @IsOptional() jumlahMsisdn?: number | string;
  @IsOptional() @IsString() detailCategory?: string;
  @IsOptional() @IsString() subCategory?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() namaPerusahaan?: string;
  @IsOptional() @IsString() projectId?: string;
}

export class UploadTicketsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UploadTicketRowDto)
  rows: UploadTicketRowDto[];
}

export class ProcessStepDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() orderId?: string;
}

export class SaveRecapDto {
  @IsOptional() @IsString() agent?: string;
  @IsOptional() @IsString() teamLeader?: string;
  @IsOptional() @IsString() waktuPengerjaanKhusus?: string;

  @IsOptional() @IsString() validationPicStatus?: string;
  @IsOptional() @IsString() validationPicNotes?: string;
  @IsOptional() @IsString() validationPksStatus?: string;
  @IsOptional() @IsString() validationPksNotes?: string;
  @IsOptional() @IsString() validationNodinStatus?: string;
  @IsOptional() @IsString() validationNodinNotes?: string;

  @IsOptional() @IsString() profilingStatus?: string;
  @IsOptional() @IsString() profilingOrderId?: string;
  @IsOptional() @IsString() profilingNotes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProcessStepDto)
  processSteps?: ProcessStepDto[];

  /** { confirmationKey: { status, notes } } */
  @IsOptional() @IsObject() confirmations?: Record<string, { status?: string; notes?: string }>;

  /** Nilai field dinamis dari form 'mass-ticket'. */
  @IsOptional() @IsObject() customValues?: Record<string, unknown>;

  @IsOptional() @IsString() notes?: string;
}

export class UpdateAgentDto {
  @IsString()
  @IsNotEmpty()
  newAgent: string;

  @IsOptional() @IsString() newTeamLeader?: string;
  @IsOptional() @IsString() reason?: string;
  @IsOptional() @IsString() notes?: string;
}

export class MarkWorkedDto {
  @IsOptional() @IsString() notes?: string;
}

export class QueryTicketsDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() agent?: string;
  @IsOptional() @IsString() teamLeader?: string;
  @IsOptional() @IsString() overallStatus?: string;
  @IsOptional() @IsString() ageingBucket?: string;
  @IsOptional() @IsString() bottleneck?: string;
  @IsOptional() @IsString() page?: string;
  @IsOptional() @IsString() limit?: string;
}

export class CreateProcessStepDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional() @IsInt() order?: number;
}

export class UpdateProcessStepDto {
  @IsOptional() @IsString() @IsNotEmpty() name?: string;
  @IsOptional() @IsInt() order?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
