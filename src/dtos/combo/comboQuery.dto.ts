import { IsString, IsOptional } from 'class-validator'

export class ComboQueryDto {
  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @IsString()
  isActive?: string

  @IsOptional()
  page?: number

  @IsOptional()
  limit?: number

  @IsOptional()
  sort?: Record<string, 'ASC' | 'DESC'>
}
