import { IsString, IsNotEmpty, IsOptional, IsInt } from 'class-validator';

export class CreateQaReconciliationDto {
  @IsString()
  @IsNotEmpty()
  qaFormTappingId: string;

  @IsString()
  @IsNotEmpty()
  tlName: string;

  @IsString()
  @IsNotEmpty()
  qcName: string;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsOptional()
  @IsInt()
  proposedScoreValiditas?: number;

  @IsOptional()
  @IsInt()
  proposedScoreServiceLevel?: number;

  @IsOptional()
  @IsInt()
  proposedScoreKalimat?: number;

  @IsOptional()
  @IsInt()
  proposedScoreResponTime?: number;

  @IsOptional()
  @IsInt()
  proposedScoreDokumentasi?: number;

  @IsOptional()
  @IsInt()
  oldScoreValiditas?: number;

  @IsOptional()
  @IsInt()
  oldScoreServiceLevel?: number;

  @IsOptional()
  @IsInt()
  oldScoreKalimat?: number;

  @IsOptional()
  @IsInt()
  oldScoreResponTime?: number;

  @IsOptional()
  @IsInt()
  oldScoreDokumentasi?: number;
}
