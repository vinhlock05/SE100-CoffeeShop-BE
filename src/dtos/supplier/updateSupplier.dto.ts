import { IsString, IsOptional, IsEmail, IsEnum } from 'class-validator'
import { SupplierStatus } from '~/enums'

export class UpdateSupplierDto {
  @IsString()
  @IsOptional()
  name?: string

  @IsString()
  @IsOptional()
  contactPerson?: string

  @IsString()
  @IsOptional()
  phone?: string

  @IsEmail({}, { message: 'Email không hợp lệ' })
  @IsOptional()
  email?: string

  @IsString()
  @IsOptional()
  address?: string

  @IsString()
  @IsOptional()
  city?: string

  @IsString()
  @IsOptional()
  category?: string

  @IsEnum(SupplierStatus, { message: 'Trạng thái phải là active hoặc inactive' })
  @IsOptional()
  status?: SupplierStatus
}
