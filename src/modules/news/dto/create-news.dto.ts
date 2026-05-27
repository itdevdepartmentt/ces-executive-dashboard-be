import { PartialType } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsObject, IsOptional } from 'class-validator';

export class CreateNewsDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsObject() // TipTap JSON object
  @IsNotEmpty()
  content: any;

  @IsString()
  authorName: string;

  @IsString()
  @IsNotEmpty()
  summary: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsString()
  @IsOptional()
  status?: string;
}

export class UpdateNewsDto extends PartialType(CreateNewsDto) {}
