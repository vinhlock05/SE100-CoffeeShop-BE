import { IsString, IsOptional, IsNumber } from 'class-validator'

export class UpdateOrderDto {
  @IsOptional()
  @IsNumber()
  tableId?: number

  @IsOptional()
  @IsString()
  status?: string

  @IsOptional()
  @IsString()
  notes?: string
}
