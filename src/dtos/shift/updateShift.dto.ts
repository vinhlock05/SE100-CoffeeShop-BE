import { IsBoolean, IsOptional, IsString, Matches } from 'class-validator'

export class UpdateShiftDto {
  @IsString()
  @IsOptional()
  name?: string

  @IsString()
  @IsOptional()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Định dạng giờ không hợp lệ (HH:MM)' })
  startTime?: string

  @IsString()
  @IsOptional()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Định dạng giờ không hợp lệ (HH:MM)' })
  endTime?: string

  @IsString()
  @IsOptional()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Định dạng giờ không hợp lệ (HH:MM)' })
  checkInTime?: string

  @IsString()
  @IsOptional()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Định dạng giờ không hợp lệ (HH:MM)' })
  checkOutTime?: string

  @IsBoolean()
  @IsOptional()
  isActive?: boolean
}
