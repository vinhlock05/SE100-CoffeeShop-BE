import { IsString, IsOptional, IsNumber, IsBoolean, IsArray, ValidateNested, Min } from 'class-validator'
import { Type } from 'class-transformer'

class OrderItemDto {
  @IsOptional()
  @IsNumber()
  itemId?: number

  @IsOptional()
  @IsNumber()
  comboId?: number

  @IsNumber()
  @Min(1)
  quantity!: number

  @IsOptional()
  @IsString()
  notes?: string

  @IsOptional()
  customization?: any

  @IsOptional()
  @IsBoolean()
  isTopping?: boolean

  @IsOptional()
  @IsNumber()
  parentItemId?: number
}

export class CreateOrderDto {
  @IsOptional()
  @IsNumber()
  tableId?: number

  @IsOptional()
  @IsString()
  orderType?: 'dine-in' | 'takeaway'

  @IsOptional()
  @IsString()
  notes?: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[]
}
