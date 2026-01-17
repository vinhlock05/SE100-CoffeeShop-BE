import { IsString, IsNumber, IsOptional } from 'class-validator'

export class CreateFinanceCategoryDto {
  @IsString()
  name: string

  @IsNumber()
  typeId: number  // 1=Thu, 2=Chi

  @IsOptional()
  @IsString()
  description?: string
}

export class UpdateFinanceCategoryDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsString()
  description?: string
}
