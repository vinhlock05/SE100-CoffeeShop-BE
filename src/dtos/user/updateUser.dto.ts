import { IsString, IsOptional, IsInt, IsEnum, MinLength } from 'class-validator'
import { UserStatus } from '~/enums/userStatus.enum'

export class UpdateUserDto {
  @IsOptional()
  @IsInt()
  roleId?: number

  @IsOptional()
  @IsEnum(UserStatus, { message: 'Invalid status value' })
  status?: UserStatus

  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  newPassword?: string
}
