import { IsString, IsOptional, IsNumber } from 'class-validator'

export class CheckoutDto {
  @IsString()
  paymentMethod!: string // 'cash' | 'card' | 'transfer'

  @IsNumber()
  paidAmount!: number

  @IsOptional()
  @IsString()
  notes?: string
}
