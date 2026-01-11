import { IsString, IsOptional, IsNumber, IsBoolean, IsArray, ValidateNested } from 'class-validator'
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

export class UpdateComboDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsString()
  imageUrl?: string

  @IsOptional()
  @IsNumber()
  comboPrice?: number

  @IsOptional()
  @IsNumber()
  originalPrice?: number

  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @IsOptional()
  @IsString()
  startDate?: string

  @IsOptional()
  @IsString()
  endDate?: string

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComboItemDto)
  items?: ComboItemDto[]
}
