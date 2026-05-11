import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export const PRIORITY_TYPES = ['roaming', 'extra', 'vip', 'pareto', 'urgent', 'cc'] as const;
export type PriorityType = (typeof PRIORITY_TYPES)[number];

export class DashboardFilterDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      if (value.toLowerCase() === 'true') return true;
      if (value.toLowerCase() === 'false') return false;
    }
    return value;
  })
  @IsBoolean()
  isFcr?: boolean;
}

export class PaginationDto extends DashboardFilterDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  search?: string;
}

export class PriorityTicketQueryDto extends PaginationDto {
  @IsIn(PRIORITY_TYPES, {
    message: `type must be one of: ${PRIORITY_TYPES.join(', ')}`,
  })
  type: PriorityType;
}