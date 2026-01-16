import { IsString, IsOptional, IsNumber, IsBoolean, IsArray, ValidateNested, Min } from 'class-validator'
import { Type } from 'class-transformer'

// Topping DTO (for attached toppings - same as AddOrderItemDto)
class ToppingDto {
  @IsNumber()
  itemId!: number

  @IsNumber()
  @Min(1)
  quantity!: number
}

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

  // Attached toppings - cùng cấu trúc với AddOrderItemDto
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ToppingDto)
  attachedToppings?: ToppingDto[]
}

export class CreateOrderDto {
  @IsOptional()
  @IsNumber()
  tableId?: number

  @IsOptional()
  @IsNumber()
  customerId?: number // null for walk-in customers

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
