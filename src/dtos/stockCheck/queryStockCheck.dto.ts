import { IsOptional, IsString } from 'class-validator'

/**
 * Query DTO cho lấy danh sách phiên kiểm kê
 */
export class StockCheckQueryDto {
  @IsString()
  @IsOptional()
  search?: string

  @IsString()
  @IsOptional()
  status?: string  // in_progress | completed | cancelled

  @IsString()
  @IsOptional()
  fromDate?: string

  @IsString()
  @IsOptional()
  toDate?: string

  @IsOptional()
  sort?: Record<string, 'ASC' | 'DESC'>

  @IsOptional()
  page?: string

  @IsOptional()
  limit?: string
}
