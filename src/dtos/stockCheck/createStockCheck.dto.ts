import { 
  IsNumber, IsNotEmpty, IsOptional, IsString, IsArray, 
  ValidateNested, IsDateString 
} from 'class-validator'
import { Type } from 'class-transformer'

/**
 * Stock Check Item DTO
 */
class StockCheckItemDto {
  @IsNumber()
  @IsNotEmpty({ message: 'Mã sản phẩm là bắt buộc' })
  itemId!: number

  @IsNumber()
  @IsNotEmpty({ message: 'Số lượng thực tế là bắt buộc' })
  actualQuantity!: number

  @IsString()
  @IsOptional()
  unit?: string

  @IsString()
  @IsOptional()
  notes?: string
}

/**
 * Create Stock Check DTO
 */
export class CreateStockCheckDto {
  @IsDateString()
  @IsOptional()
  checkDate?: string

  @IsString()
  @IsOptional()
  notes?: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StockCheckItemDto)
  @IsNotEmpty({ message: 'Danh sách sản phẩm kiểm kê là bắt buộc' })
  items!: StockCheckItemDto[]
}
