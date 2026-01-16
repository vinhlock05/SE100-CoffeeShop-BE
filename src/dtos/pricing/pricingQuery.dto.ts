import { IsOptional, IsString, IsNumber } from 'class-validator'
import { Type } from 'class-transformer'

/**
 * Query DTO cho danh sách giá
 */
export class PricingQueryDto {
  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  categoryId?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  itemTypeId?: number

  @IsOptional()
  sort?: Record<string, 'ASC' | 'DESC'>

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number
}
