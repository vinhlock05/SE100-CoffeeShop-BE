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

  @IsString()
  @IsOptional()
  sortBy?: 'checkDate' | 'code'

  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc'

  @IsOptional()
  page?: string

  @IsOptional()
  limit?: string
}
