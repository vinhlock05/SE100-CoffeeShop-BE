import { IsString, IsOptional, IsEnum, IsDateString, IsNumber, IsEmail, Min } from 'class-validator'
import { Gender, SalaryType } from './createStaff.dto'

export class UpdateStaffDto {
  // --- Basic Information ---
  @IsOptional()
  @IsString()
  fullName?: string

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
  
  @IsOptional()
  @IsString()
  status?: string // active, inactive, quit

  // --- Account Management (Unified) ---
  // If provided, backend will create new account or update existing one
  @IsOptional()
  @IsString()
  username?: string

  @IsOptional()
  @IsString()
  password?: string // Should send only if resetting password

  @IsOptional()
  @IsNumber()
  roleId?: number

  // --- Salary Information Upgrade (Optional) ---
  // If provided, creates a NEW salary setting record
  @IsOptional()
  @IsEnum(SalaryType)
  newSalaryType?: SalaryType

  @IsOptional()
  @IsNumber()
  @Min(0)
  newBaseRate?: number
  
  @IsOptional()
  @IsDateString()
  salaryEffectiveDate?: string
}
