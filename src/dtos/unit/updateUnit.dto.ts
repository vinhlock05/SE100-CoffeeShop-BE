import { IsString, IsOptional } from 'class-validator'

export class UpdateUnitDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsString()
  symbol?: string
}
