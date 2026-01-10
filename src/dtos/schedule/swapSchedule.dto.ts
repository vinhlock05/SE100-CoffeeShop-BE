import { IsNumber, IsArray, IsDateString, ValidateNested, IsOptional, IsString } from 'class-validator'
import { Type } from 'class-transformer'

class SwapItem {
  @IsNumber()
  staffId!: number

  @IsNumber()
  shiftId!: number

  @IsDateString()
  workDate!: string
}

export class SwapScheduleDto {
  @ValidateNested()
  @Type(() => SwapItem)
  from!: SwapItem

  @ValidateNested()
  @Type(() => SwapItem)
  to!: SwapItem
}
