import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsEnum, IsArray, ValidateNested, Min } from 'class-validator'
import { Type } from 'class-transformer'
import { InventorySaleStatus } from '~/enums'

export class IngredientInput {
  @IsNumber()
  @IsNotEmpty()
  ingredientItemId!: number

  @IsNumber()
  @Min(0)
  quantity!: number

  @IsOptional()
  @IsString()
  unit?: string
}

/**
 * Create Item DTO
 * - stockStatus (trạng thái kho) được TỰ ĐỘNG tính từ currentStock/minStock
 * - saleStatus (trạng thái bán) có thể được set bởi user
 */
export class CreateItemDto {
  @IsString()
  @IsNotEmpty({ message: 'Tên sản phẩm là bắt buộc' })
  name!: string

  @IsNumber()
  @IsNotEmpty({ message: 'Loại sản phẩm là bắt buộc' })
  itemTypeId!: number

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
  saleStatus?: InventorySaleStatus

  @IsOptional()
  @IsBoolean()
  isTopping?: boolean

  @IsOptional()
  @IsString()
  imageUrl?: string

  // Danh sách nguyên liệu cho sản phẩm pha chế
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IngredientInput)
  ingredients?: IngredientInput[]

  // Danh sách topping cho sản phẩm
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  toppingIds?: number[]
}
