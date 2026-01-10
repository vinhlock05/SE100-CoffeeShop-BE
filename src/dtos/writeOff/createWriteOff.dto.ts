import { 
  IsNumber, IsNotEmpty, IsOptional, IsString, IsArray, 
  ValidateNested, IsDateString 
} from 'class-validator'
import { Type } from 'class-transformer'

/**
 * Write-Off Item DTO
 */
class WriteOffItemDto {
  @IsNumber()
  @IsNotEmpty({ message: 'Mã sản phẩm là bắt buộc' })
  itemId!: number

  @IsNumber()
  @IsNotEmpty({ message: 'Mã lô hàng là bắt buộc' })
  batchId!: number

  @IsNumber()
  @IsNotEmpty({ message: 'Số lượng là bắt buộc' })
  quantity!: number

  @IsString()
  @IsOptional()
  unit?: string

  @IsNumber()
  @IsOptional()
  unitCost?: number

  @IsString()
  @IsOptional()
  reason?: string
}

/**
 * Create Write-Off DTO
 */
export class CreateWriteOffDto {
  @IsDateString()
  @IsOptional()
  writeOffDate?: string

  @IsString()
  @IsOptional()
  reason?: string

  @IsString()
  @IsOptional()
  notes?: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WriteOffItemDto)
  @IsNotEmpty({ message: 'Danh sách sản phẩm xuất huỷ là bắt buộc' })
  items!: WriteOffItemDto[]
}
