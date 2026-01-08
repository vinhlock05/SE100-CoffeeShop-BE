import { IsString, IsNotEmpty, IsOptional, IsArray, IsBoolean } from 'class-validator'

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty({ message: 'Role name is required' })
  name!: string

  @IsOptional()
  @IsString()
  description?: string

  @IsArray({ message: 'Permissions must be an array' })
  @IsString({ each: true })
  permissions!: string[]

  @IsOptional()
  @IsBoolean()
  isSystem?: boolean
}
