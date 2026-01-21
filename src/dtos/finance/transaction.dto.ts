import { IsString, IsNumber, IsOptional, IsDateString, IsIn, IsArray } from 'class-validator'

export class CreateFinanceTransactionDto {
  @IsNumber()
  categoryId: number

  @IsNumber()
  amount: number

  @IsIn(['cash', 'bank'])
  paymentMethod: 'cash' | 'bank'

  @IsOptional()
  @IsNumber()
  bankAccountId?: number

  @IsOptional()
  @IsIn(['customer', 'staff', 'supplier', 'other'])
  personType?: 'customer' | 'staff' | 'supplier' | 'other'

  @IsOptional()
  @IsNumber()
  personId?: number

  @IsOptional()
  @IsString()
  personName?: string

  @IsOptional()
  @IsString()
  personPhone?: string

  @IsOptional()
  @IsDateString()
  transactionDate?: string

  @IsOptional()
  @IsString()
  notes?: string

  @IsOptional()
  @IsIn(['order', 'purchase_order', 'payroll'])
  referenceType?: 'order' | 'purchase_order' | 'payroll'

  @IsOptional()
  @IsNumber()
  referenceId?: number
}

export class UpdateFinanceTransactionDto {
  @IsOptional()
  @IsString()
  notes?: string

  @IsOptional()
  @IsDateString()
  transactionDate?: string

  // Only allowed if referenceType is null
  @IsOptional()
  @IsNumber()
  amount?: number

  // Only allowed if referenceType is null
  @IsOptional()
  @IsNumber()
  categoryId?: number
}

export class FinanceTransactionQueryDto {
  @IsOptional()
  page?: number

  @IsOptional()
  limit?: number

  @IsOptional()
  @IsString()
  search?: string  // code, note, personName, personPhone

  @IsOptional()
  @IsNumber()
  typeId?: number  // 1=Thu, 2=Chi

  @IsOptional()
  @IsArray()
  categoryIds?: number[]

  @IsOptional()
  @IsIn(['cash', 'bank'])
  paymentMethod?: 'cash' | 'bank'

  @IsOptional()
  @IsIn(['completed', 'cancelled'])
  status?: 'completed' | 'cancelled'

  @IsOptional()
  @IsArray()
  creatorIds?: number[]

  @IsOptional()
  @IsString()
  dateFrom?: string

  @IsOptional()
  @IsString()
  dateTo?: string

  // Granular searches
  @IsOptional()
  @IsString()
  code?: string

  @IsOptional()
  @IsString()
  notes?: string

  @IsOptional()
  @IsString()
  personName?: string

  @IsOptional()
  @IsString()
  personPhone?: string

  @IsOptional()
  sort?: Record<string, 'ASC' | 'DESC'>
}

export class CashBookStatsQueryDto {
  @IsOptional()
  @IsString()
  dateFrom?: string

  @IsOptional()
  @IsString()
  dateTo?: string

  @IsOptional()
  @IsIn(['cash', 'bank'])
  paymentMethod?: 'cash' | 'bank'
}
