import { IsString, IsOptional, IsNumber } from 'class-validator'

export class OrderQueryDto {
  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @IsString()
  status?: string

  @IsOptional()
  @IsString()
  paymentStatus?: string

  @IsOptional()
  @IsNumber()
  tableId?: number

  @IsOptional()
  @IsString()
  fromDate?: string

  @IsOptional()
  @IsString()
  toDate?: string

  @IsOptional()
  page?: number

  @IsOptional()
  limit?: number

  @IsOptional()
  @IsString()
  sortBy?: string

  @IsOptional()
  @IsString()
  order?: 'asc' | 'desc'
}
