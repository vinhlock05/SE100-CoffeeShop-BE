import { IsString, IsNotEmpty, IsOptional, IsEmail, IsDateString, IsEnum, IsNumber, Min, ValidateIf } from 'class-validator'

export enum Gender {
  MALE = 'Nam',
  FEMALE = 'Nữ',
  OTHER = 'Khác'
}

export enum SalaryType {
  HOURLY = 'hourly', // Theo giờ
  MONTHLY = 'monthly' // Theo tháng
}

export class CreateStaffDto {
  // --- Basic Information ---
  @IsString()
  @IsNotEmpty({ message: 'Staff code is required' })
  code!: string

  @IsString()
  @IsNotEmpty({ message: 'Full name is required' })
  fullName!: string

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender

  @IsOptional()
  @IsDateString()
  birthday?: string

  @IsOptional()
  @IsString()
  phone?: string

  @IsOptional()
  @IsEmail({}, { message: 'Invalid email format' })
  email?: string

  @IsOptional()
  @IsString()
  address?: string

  @IsOptional()
  @IsString()
  city?: string

  @IsOptional()
  @IsString()
  idCard?: string

  @IsOptional()
  @IsString()
  position?: string

  @IsOptional()
  @IsString()
  department?: string

  @IsOptional()
  @IsDateString()
  hireDate?: string

  // --- Account Information (Optional) ---
  @IsOptional()
  @IsString()
  username?: string

  @ValidateIf(o => o.username)
  @IsNotEmpty({ message: 'Password is required when creating account' })
  @IsString()
  password?: string

  @ValidateIf(o => o.username)
  @IsNotEmpty({ message: 'Role is required when creating account' })
  @IsNumber()
  roleId?: number

  // --- Salary Information (Optional) ---
  @IsOptional()
  @IsEnum(SalaryType)
  salaryType?: SalaryType

  @ValidateIf(o => o.salaryType)
  @IsNotEmpty({ message: 'Base rate is required for salary' })
  @IsNumber()
  @Min(0)
  baseRate?: number
}
