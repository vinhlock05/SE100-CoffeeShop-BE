import { IsInt, IsOptional, IsString } from 'class-validator'

export class CheckInDto {
  @IsInt({ message: 'Shift ID phải là số' })
  shiftId: number

  @IsString()
  @IsOptional()
  note?: string
}
