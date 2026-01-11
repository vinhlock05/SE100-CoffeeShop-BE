import { IsString, IsOptional, IsNumber, IsArray, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'

class ComboItemDto {
  @IsNumber()
  itemId!: number

  @IsNumber()
  quantity!: number

  @IsOptional()
  @IsString()
  groupName?: string

  @IsOptional()
  isRequired?: boolean
}

export class CreateComboDto {
  @IsString()
  name!: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsString()
  imageUrl?: string

  @IsNumber()
  comboPrice!: number

  @IsOptional()
  @IsNumber()
  originalPrice?: number

  @IsOptional()
  @IsString()
  startDate?: string

  @IsOptional()
  @IsString()
  endDate?: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComboItemDto)
  items!: ComboItemDto[]
}
