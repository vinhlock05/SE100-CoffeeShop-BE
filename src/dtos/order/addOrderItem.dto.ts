import { IsString, IsOptional, IsNumber, IsBoolean, IsArray, ValidateNested, Min } from 'class-validator'
import { Type } from 'class-transformer'

// Topping DTO (for attached toppings)
class ToppingDto {
  @IsNumber()
  itemId!: number

  @IsNumber()
  @Min(1)
  quantity!: number
}

export class AddOrderItemDto {
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

  // Attached toppings - gửi cùng lúc với món chính
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ToppingDto)
  attachedToppings?: ToppingDto[]
}
