import { IsString, IsOptional, IsNumber, IsBoolean, IsEnum, IsArray, ValidateNested, Min } from 'class-validator'
import { Type } from 'class-transformer'
import { InventorySaleStatus } from '~/enums'
import { IngredientInput } from './createItem.dto'

/**
 * Update Item DTO
 * - stockStatus được TỰ ĐỘNG tính, không cho update
 * - productStatus có thể được set bởi user
 */
export class UpdateItemDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsNumber()
  itemTypeId?: number

  @IsOptional()
  @IsNumber()
  categoryId?: number

  @IsOptional()
  @IsNumber()
  unitId?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  minStock?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxStock?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  sellingPrice?: number

  // Trạng thái bán - user có thể set
  @IsOptional()
  @IsEnum(InventorySaleStatus, { message: 'Trạng thái bán không hợp lệ' })
  productStatus?: InventorySaleStatus

  @IsOptional()
  @IsBoolean()
  isTopping?: boolean

  @IsOptional()
  @IsString()
  imageUrl?: string

  // Danh sách nguyên liệu (thay thế toàn bộ)
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IngredientInput)
  ingredients?: IngredientInput[]

  // Danh sách topping (thay thế toàn bộ) - dùng khi update product
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  toppingIds?: number[]

  // Danh sách product mà topping này áp dụng (thay thế toàn bộ) - dùng khi update topping
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  productIds?: number[]
}
