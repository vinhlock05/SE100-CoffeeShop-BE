import { IsString, IsOptional } from 'class-validator'

export class CreateFinancePersonDto {
  @IsString()
  name: string

  @IsOptional()
  @IsString()
  phone?: string

  @IsOptional()
  @IsString()
  address?: string

  @IsOptional()
  @IsString()
  notes?: string
}

export class UpdateFinancePersonDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsString()
  phone?: string

  @IsOptional()
  @IsString()
  address?: string

  @IsOptional()
  @IsString()
  notes?: string
}

export class FinancePersonQueryDto {
  @IsOptional()
  search?: string

  @IsOptional()
  page?: number

  @IsOptional()
  limit?: number
}
