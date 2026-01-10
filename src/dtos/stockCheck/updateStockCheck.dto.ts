import { 
  IsNumber, IsOptional, IsString, IsArray, 
  ValidateNested, IsDateString 
} from 'class-validator'
import { Type } from 'class-transformer'

/**
 * Stock Check Item DTO
 */
class StockCheckItemDto {
  @IsNumber()
  itemId!: number

  @IsNumber()
  actualQuantity!: number

  @IsString()
  @IsOptional()
  unit?: string

  @IsString()
  @IsOptional()
  notes?: string
}

/**
 * Update Stock Check DTO (chỉ phiếu in_progress)
 */
export class UpdateStockCheckDto {
  @IsDateString()
  @IsOptional()
  checkDate?: string

  @IsString()
  @IsOptional()
  notes?: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StockCheckItemDto)
  @IsOptional()
  items?: StockCheckItemDto[]
}
