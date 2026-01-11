import { IsString, IsOptional, IsArray } from 'class-validator'

export class KitchenQueryDto {
  @IsOptional()
  @IsString()
  status?: string  // preparing, completed, all

  @IsOptional()
  @IsString()
  groupBy?: 'table' | 'item'
}

export class ReportOutOfStockDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ingredients?: string[]

  @IsOptional()
  @IsString()
  reason?: string
}
