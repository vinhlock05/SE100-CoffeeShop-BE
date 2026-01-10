
import { IsInt, IsDateString, IsOptional, IsString } from 'class-validator'

export class UpdateScheduleDto {
  @IsInt()
  @IsOptional()
  shiftId?: number

  @IsDateString()
  @IsOptional()
  workDate?: string

  @IsString()
  @IsOptional()
  status?: string

  @IsString()
  @IsOptional()
  notes?: string
}
