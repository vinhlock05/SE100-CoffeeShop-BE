import { IsOptional, IsInt, IsString, IsEnum, Min } from 'class-validator'
import { Type } from 'class-transformer'
import { UserStatus } from '~/enums/userStatus.enum'

export class UserQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20

  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  roleId?: number
}
