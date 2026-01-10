import { IsNumber, IsArray, IsString, IsOptional, IsDateString } from 'class-validator'

export class BulkTimekeepingDto {
  @IsDateString()
  date!: string

  @IsNumber()
  shiftId!: number

  @IsString()
  checkIn!: string

  @IsString()
  checkOut!: string

  @IsArray()
  @IsNumber({}, { each: true })
  staffIds!: number[]
}

export class UpdateTimekeepingDto {
  @IsOptional()
  @IsString()
  checkIn?: string

  @IsOptional()
  @IsString()
  checkOut?: string

  @IsOptional()
  @IsString()
  status?: string

  @IsOptional()
  @IsString()
  notes?: string
}

export class TimekeepingQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string

  @IsOptional()
  @IsDateString()
  to?: string

  @IsOptional()
  @IsNumber()
  staffId?: number

  @IsOptional()
  @IsNumber()
  shiftId?: number
}
