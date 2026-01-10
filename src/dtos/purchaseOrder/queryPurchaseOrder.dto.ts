import { IsString, IsOptional, IsIn, IsNumberString, IsDateString } from 'class-validator'

export class PurchaseOrderQueryDto {
  @IsString()
  @IsOptional()
  search?: string

  @IsIn(['draft', 'completed', 'cancelled'])
  @IsOptional()
  status?: 'draft' | 'completed' | 'cancelled'

  @IsIn(['paid', 'partial', 'unpaid'])
  @IsOptional()
  paymentStatus?: 'paid' | 'partial' | 'unpaid'

  @IsNumberString()
  @IsOptional()
  supplierId?: string

  @IsDateString()
  @IsOptional()
  fromDate?: string

  @IsDateString()
  @IsOptional()
  toDate?: string

  @IsIn(['orderDate', 'totalAmount', 'code'])
  @IsOptional()
  sortBy?: 'orderDate' | 'totalAmount' | 'code'

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
