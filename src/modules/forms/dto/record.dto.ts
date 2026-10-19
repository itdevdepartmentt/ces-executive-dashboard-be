import {
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class SubmitRecordDto {
  /**
   * Nilai per field: { fieldKey: value }. Tidak divalidasi di sini karena
   * bentuknya ditentukan definisi field yang tersimpan di database —
   * pemeriksaannya dilakukan FormRecordsService.validateValues().
   */
  @IsObject()
  values: Record<string, unknown>;

  @IsOptional()
  @IsString()
  refNumber?: string;
}

export class UpdateRecordDto {
  @IsOptional()
  @IsObject()
  values?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  refNumber?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  status?: string;
}

export class QueryRecordDto {
  @IsOptional()
  @IsString()
  formKey?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sort?: 'asc' | 'desc';
}
