import { IsNumber, IsArray, ValidateNested, Min } from 'class-validator'
import { Type } from 'class-transformer'

export class PriceUpdateItem {
  @IsNumber()
  id!: number

  @IsNumber()
  @Min(0)
  sellingPrice!: number
}

/**
 * DTO cập nhật giá trực tiếp cho nhiều sản phẩm
 */
export class BatchUpdatePriceDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PriceUpdateItem)
  items!: PriceUpdateItem[]
}
