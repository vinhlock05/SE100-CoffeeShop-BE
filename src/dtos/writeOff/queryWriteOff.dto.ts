import { IsOptional, IsString } from 'class-validator'

/**
 * Query DTO cho lấy danh sách phiếu xuất huỷ
 */
export class WriteOffQueryDto {
  @IsString()
  @IsOptional()
  search?: string

  @IsString()
  @IsOptional()
  status?: string  // draft | completed | cancelled

  @IsString()
  @IsOptional()
  fromDate?: string

  @IsString()
  @IsOptional()
  toDate?: string

  @IsString()
  @IsOptional()
  sortBy?: 'writeOffDate' | 'totalValue' | 'code'

  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc'

  @IsOptional()
  page?: string

  @IsOptional()
  limit?: string
}
