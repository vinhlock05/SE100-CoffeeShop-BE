import { IsNumber, IsOptional, IsString, Min } from 'class-validator'

export class PurchaseOrderPaymentDto {
  @IsNumber()
  @Min(1)
  amount!: number

  @IsString()
  paymentMethod!: string // 'cash' | 'bank'

  @IsOptional()
  @IsNumber()
  bankAccountId?: number // Link to BankAccount when paymentMethod is 'bank'

  @IsOptional()
  @IsString()
  notes?: string
}
