import { IsNumber, IsOptional, IsEnum } from 'class-validator'
import { PriceBaseType, AdjustmentType } from '~/enums'

/**
 * DTO cập nhật giá cho tất cả sản phẩm trong 1 danh mục
 * newPrice = basePrice + adjustment
 */
export class UpdateCategoryPriceDto {
  @IsNumber()
  categoryId!: number

  // Loại giá làm cơ sở tính (default: current)
  @IsEnum(PriceBaseType)
  @IsOptional()
  baseType?: PriceBaseType = PriceBaseType.CURRENT

  // Giá trị điều chỉnh (có thể âm hoặc dương)
  @IsNumber()
  adjustmentValue!: number

  // Loại điều chỉnh: VNĐ hoặc % (default: amount)
  @IsEnum(AdjustmentType)
  @IsOptional()
  adjustmentType?: AdjustmentType = AdjustmentType.AMOUNT
}
