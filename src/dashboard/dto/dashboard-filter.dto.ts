import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export const PRIORITY_TYPES = ['roaming', 'extra', 'vip', 'pareto', 'urgent', 'cc'] as const;
export type PriorityType = (typeof PRIORITY_TYPES)[number];

export class DashboardFilterDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
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