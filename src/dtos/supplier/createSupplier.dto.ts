import { IsString, IsNotEmpty, IsOptional, IsEmail } from 'class-validator'

export class CreateSupplierDto {
  @IsString()
  @IsNotEmpty({ message: 'Tên nhà cung cấp là bắt buộc' })
  name!: string

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
}
