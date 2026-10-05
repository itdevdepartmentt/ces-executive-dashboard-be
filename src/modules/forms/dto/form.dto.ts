import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';
import { FormFieldType } from '@prisma/client';

/** Key dipakai sebagai nama properti di JSON nilai, jadi dibatasi ketat. */
const KEY_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]*$/;
const KEY_MESSAGE =
  'key harus diawali huruf dan hanya boleh berisi huruf, angka, atau garis bawah';

export class CreateFormDto {
  @IsString()
  @IsNotEmpty()
  @Matches(KEY_PATTERN, { message: KEY_MESSAGE })
  key: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateFormDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateSectionDto {
  @IsString()
  @IsNotEmpty()
  @Matches(KEY_PATTERN, { message: KEY_MESSAGE })
  key: string;

  @IsString()
  @IsNotEmpty()
  label: string;

  @IsOptional()
  @IsInt()
  order?: number;
}

export class UpdateSectionDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  label?: string;

  @IsOptional()
  @IsInt()
  order?: number;
}

export class CreateFieldDto {
  @IsString()
  @IsNotEmpty()
  @Matches(KEY_PATTERN, { message: KEY_MESSAGE })
  key: string;

  @IsString()
  @IsNotEmpty()
  label: string;

  @IsEnum(FormFieldType)
  type: FormFieldType;

  @IsOptional()
  @IsString()
  helpText?: string;

  @IsOptional()
  @IsString()
  sectionId?: string;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsInt()
  order?: number;

  @IsOptional()
  @IsArray()
  options?: { value: string; label: string }[];

  @IsOptional()
  @IsObject()
  validation?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  columns?: { key: string; label: string; type?: FormFieldType }[];

  @IsOptional()
  @IsString()
  defaultValue?: string;
}

export class UpdateFieldDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  label?: string;

  @IsOptional()
  @IsEnum(FormFieldType)
  type?: FormFieldType;

  @IsOptional()
  @IsString()
  helpText?: string;

  @IsOptional()
  @IsString()
  sectionId?: string | null;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsInt()
  order?: number;

  @IsOptional()
  @IsArray()
  options?: { value: string; label: string }[];

  @IsOptional()
  @IsObject()
  validation?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  columns?: { key: string; label: string; type?: FormFieldType }[];

  @IsOptional()
  @IsString()
  defaultValue?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

class ReorderItemDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsInt()
  order: number;
}

/** Dipakai saat field digeser-geser di UI; satu transaksi untuk semua. */
export class ReorderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderItemDto)
  items: ReorderItemDto[];
}
