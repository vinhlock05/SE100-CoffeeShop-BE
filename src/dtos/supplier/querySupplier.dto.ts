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

  @IsOptional()
  sort?: Record<string, 'ASC' | 'DESC'>

  @IsNumberString()
  @IsOptional()
  page?: string

  @IsNumberString()
  @IsOptional()
  limit?: string
}
