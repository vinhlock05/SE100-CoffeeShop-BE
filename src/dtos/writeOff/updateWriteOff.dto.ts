import { 
  IsNumber, IsOptional, IsString, IsArray, 
  ValidateNested, IsDateString 
} from 'class-validator'
import { Type } from 'class-transformer'

/**
 * Write-Off Item DTO
 */
class WriteOffItemDto {
  @IsNumber()
  itemId!: number

  @IsNumber()
  batchId!: number

  @IsNumber()
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
 * Update Write-Off DTO (chỉ phiếu draft)
 */
export class UpdateWriteOffDto {
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
  @IsOptional()
  items?: WriteOffItemDto[]
}
