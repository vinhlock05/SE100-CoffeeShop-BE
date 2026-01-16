import { IsOptional, IsString, IsNumber } from 'class-validator'

export class StaffQueryDto {
  @IsOptional()
  @IsString()
  page?: string

  @IsOptional()
  @IsString()
  limit?: string

  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @IsString()
  department?: string

  @IsOptional()
  @IsString()
  position?: string

  @IsOptional()
  @IsString()
  status?: string

  @IsOptional()
  @IsString()
  sort?: Record<string, 'ASC' | 'DESC'>
}
