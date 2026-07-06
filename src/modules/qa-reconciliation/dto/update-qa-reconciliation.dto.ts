import { PartialType } from '@nestjs/mapped-types';
import { CreateQaReconciliationDto } from './create-qa-reconciliation.dto';
import { IsString, IsOptional, IsIn } from 'class-validator';

export class UpdateQaReconciliationDto extends PartialType(CreateQaReconciliationDto) {
  @IsOptional()
  @IsString()
  @IsIn(['PENDING', 'APPROVED', 'REJECTED'])
  status?: string;

  @IsOptional()
  @IsString()
  qcResponseNotes?: string;
}
