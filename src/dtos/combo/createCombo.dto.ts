import { IsString, IsOptional, IsNumber, IsBoolean, IsArray, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'

class ComboItemDto {
  @IsNumber()
  itemId!: number

  @IsOptional()
  @IsNumber()
  extraPrice?: number
}

class ComboGroupDto {
  @IsString()
  name!: string

  @IsNumber()
  minChoices!: number

  @IsNumber()
  maxChoices!: number

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComboItemDto)
  items!: ComboItemDto[]
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
  @Type(() => ComboGroupDto)
  groups!: ComboGroupDto[]
}
