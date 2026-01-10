import { IsNumber, IsOptional, IsEnum } from 'class-validator'
import { PriceBaseType, AdjustmentType } from '~/enums'

/**
 * DTO cập nhật giá cho 1 sản phẩm
 * newPrice = basePrice + adjustment
 */
export class UpdateSinglePriceDto {
  @IsNumber()
  itemId!: number

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
