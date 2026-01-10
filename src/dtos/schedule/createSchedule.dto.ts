
import { IsInt, IsDateString, IsNotEmpty, IsOptional, IsString, IsArray } from 'class-validator'

export class CreateScheduleDto {
  @IsInt()
  @IsNotEmpty()
  staffId!: number

  @IsArray()
  @IsInt({ each: true })
  @IsNotEmpty()
  shiftIds!: number[]

  @IsDateString()
  @IsNotEmpty()
  workDate!: string

  @IsString()
  @IsOptional()
  notes?: string
}

export class BulkCreateScheduleDto {
    @IsArray()
    @IsNotEmpty()
    schedules!: CreateScheduleDto[]
}

export class ScheduleQueryDto {
    @IsOptional()
    @IsDateString()
    from?: string

    @IsOptional()
    @IsDateString()
    to?: string

    @IsOptional()
    @IsInt() // Transform needed if query param string
    staffId?: number

    @IsOptional()
    @IsInt()
    shiftId?: number
}
