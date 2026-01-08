import { IsString, IsOptional, IsArray, IsBoolean } from 'class-validator'

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[]

  @IsOptional()
  @IsBoolean()
  isSystem?: boolean
}
