import { IsBoolean, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator'

export class CreateShiftDto {
  @IsString()
  @IsNotEmpty({ message: 'Tên ca không được để trống' })
  name: string

  @IsString()
  @IsNotEmpty({ message: 'Giờ bắt đầu không được để trống' })
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Định dạng giờ không hợp lệ (HH:MM)' })
  startTime: string

  @IsString()
  @IsNotEmpty({ message: 'Giờ kết thúc không được để trống' })
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Định dạng giờ không hợp lệ (HH:MM)' })
  endTime: string

  @IsString()
  @IsNotEmpty({ message: 'Giờ bắt đầu điểm danh không được để trống' })
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Định dạng giờ không hợp lệ (HH:MM)' })
  checkInTime: string

  @IsString()
  @IsNotEmpty({ message: 'Giờ kết thúc điểm danh không được để trống' })
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Định dạng giờ không hợp lệ (HH:MM)' })
  checkOutTime: string

  @IsBoolean()
  @IsOptional()
  isActive?: boolean
}
