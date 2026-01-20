import { IsString, IsOptional, IsNumber, IsArray, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'

class SelectedGiftDto {
  @IsNumber()
  itemId!: number

  @IsNumber()
  quantity!: number
}

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

  @IsOptional()
  @IsNumber()
  promotionId?: number // Promotion to apply at checkout

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SelectedGiftDto)
  selectedGifts?: SelectedGiftDto[] // For gift promotions (type 4)
}

