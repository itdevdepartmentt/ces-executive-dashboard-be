import { IsOptional, IsString, IsBoolean, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

// ─── AccountMapping DTOs ───
export class CreateAccountMappingDto {
  @IsString()
  b2b_account_id: string;

  @IsOptional() @IsString()
  corporateName?: string;

  @IsOptional() @IsString()
  kategoriAccount?: string;

  @IsOptional() @IsString()
  group?: string;

  @IsOptional() @IsString()
  divisi?: string;

  @IsOptional() @IsString()
  department?: string;

  @IsOptional() @IsString()
  mppCodeNew?: string;

  @IsOptional() @IsString()
  namaAM?: string;
}

export class UpdateAccountMappingDto {
  @IsOptional() @IsString()
  b2b_account_id?: string;

  @IsOptional() @IsString()
  corporateName?: string;

  @IsOptional() @IsString()
  kategoriAccount?: string;

  @IsOptional() @IsString()
  group?: string;

  @IsOptional() @IsString()
  divisi?: string;

  @IsOptional() @IsString()
  department?: string;

  @IsOptional() @IsString()
  mppCodeNew?: string;

  @IsOptional() @IsString()
  namaAM?: string;
}

// ─── LookupKIP DTOs ───
export class CreateLookupKIPDto {
  @IsOptional() @IsString()
  category?: string;

  @IsOptional() @IsString()
  subCategory?: string;

  @IsOptional() @IsString()
  detailCategoryFull?: string;

  @IsOptional() @IsString()
  detailCategory?: string;

  @IsOptional() @IsString()
  detailCategory2?: string;

  @IsOptional() @IsString()
  compositeKeyOmnix?: string;

  @IsOptional() @IsString()
  compositeKey?: string;

  @IsOptional() @IsString()
  fcrNonSatuan?: string;

  @IsOptional() @IsString()
  escToSatuan?: string;

  @IsOptional() @IsString()
  fcrNonMassal?: string;

  @IsOptional() @IsString()
  escToMassal?: string;

  @IsOptional() @IsBoolean()
  isFcr?: boolean;

  @IsOptional() @IsString()
  product?: string;
}

export class UpdateLookupKIPDto extends CreateLookupKIPDto {}

// ─── LookupAgent DTOs ───
export class CreateLookupAgentDto {
  @IsOptional() @IsString()
  namaAgent?: string;

  @IsOptional() @IsString()
  group?: string;
}

export class UpdateLookupAgentDto extends CreateLookupAgentDto {}

// ─── Query DTO ───
export class QueryLookupDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number;

  @IsOptional() @IsString()
  search?: string;
}
