import { IsString, IsNotEmpty, MinLength, MaxLength, IsInt } from 'class-validator'

export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'Username is required' })
  @MinLength(3, { message: 'Username must be at least 3 characters' })
  @MaxLength(50, { message: 'Username must not exceed 50 characters' })
  username!: string

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password!: string

  @IsInt({ message: 'Role ID must be an integer' })
  roleId!: number
}
