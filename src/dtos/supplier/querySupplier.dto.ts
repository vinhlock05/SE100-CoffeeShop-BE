import { IsString, IsOptional, IsIn, IsNumberString } from 'class-validator'

export class SupplierQueryDto {
  @IsString()
  @IsOptional()
  search?: string

  @IsIn(['active', 'inactive'])
  @IsOptional()
  status?: 'active' | 'inactive'

  @IsString()
  @IsOptional()
  category?: string

  @IsString()
  @IsOptional()
  city?: string

  @IsIn(['name', 'totalDebt', 'createdAt'])
  @IsOptional()
  sortBy?: 'name' | 'totalDebt' | 'createdAt'

  @IsIn(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc'

  @IsNumberString()
  @IsOptional()
  page?: string

  @IsNumberString()
  @IsOptional()
  limit?: string
}
