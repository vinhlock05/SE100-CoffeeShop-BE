import { IsString, IsOptional, IsNumber } from 'class-validator'

export class CheckoutDto {
  @IsString()
  paymentMethod!: string // 'cash' | 'card' | 'transfer'

  @IsNumber()
  paidAmount!: number

  @IsOptional()
  @IsNumber()
  bankAccountId?: number // Required when paymentMethod is 'transfer'

  @IsOptional()
  @IsString()
  notes?: string
}
