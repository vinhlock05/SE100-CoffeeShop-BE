import { IsString, IsOptional, IsNumber } from 'class-validator'

export class UpdateOrderDto {
  @IsOptional()
  @IsNumber()
  tableId?: number

  @IsOptional()
  @IsNumber()
  customerId?: number // Allow linking customer to existing order

  @IsOptional()
  @IsString()
  status?: string

  @IsOptional()
  @IsString()
  notes?: string
}
