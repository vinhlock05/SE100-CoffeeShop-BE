import { IsString, IsOptional, IsNumber, Min, IsArray, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'

class ToppingUpdateDto {
  @IsNumber()
  itemId!: number

  @IsNumber()
  @Min(1)
  quantity!: number
}

// Update order item (quantity, notes, customization, status)
export class UpdateOrderItemDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number

  @IsOptional()
  @IsString()
  notes?: string

  @IsOptional()
  customization?: any

  @IsOptional()
  @IsString()
  status?: string

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ToppingUpdateDto)
  attachedToppings?: ToppingUpdateDto[]
}

// Reduce/Cancel item with reason
export class ReduceItemDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number  // null = remove all

  @IsString()
  reason!: string
}
