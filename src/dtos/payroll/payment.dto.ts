import { IsNumber, IsString, IsOptional, IsEnum } from 'class-validator'

export class PayrollPaymentDto {
  @IsNumber()
  staffId!: number

  @IsNumber()
  amount!: number

  @IsEnum(['cash', 'transfer'])
  method!: 'cash' | 'transfer'

  @IsOptional()
  @IsString()
  bankName?: string

  @IsOptional()
  @IsString()
  bankAccount?: string

  @IsOptional()
  @IsString()
  note?: string
}
