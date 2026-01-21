import { IsNumber, IsString, IsOptional, IsDateString } from 'class-validator'

export class CreateTimekeepingDto {
  @IsNumber()
  staffId!: number

  @IsNumber()
  shiftId!: number

  @IsDateString()
  workDate!: string

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
