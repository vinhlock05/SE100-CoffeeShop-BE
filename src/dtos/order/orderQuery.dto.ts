import { IsString, IsOptional, IsNumber, IsArray } from 'class-validator'
import { Transform } from 'class-transformer'

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

  // Filter đơn hàng có món với status cụ thể (VD: ?itemStatus=canceled để lọc đơn có món bị hủy)
  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value
    if (typeof value === 'string') return value.split(',')
    return [value]
  })
  @IsArray()
  itemStatus?: string[]

  @IsOptional()
  page?: number

  @IsOptional()
  limit?: number

  @IsOptional()
  sort?: Record<string, 'ASC' | 'DESC'>
}
