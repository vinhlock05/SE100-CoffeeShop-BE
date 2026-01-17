import { IsString, IsOptional, IsBoolean } from 'class-validator'

export class CreateBankAccountDto {
  @IsString()
  accountName: string

  @IsString()
  accountNumber: string

  @IsString()
  bankName: string

  @IsString()
  ownerName: string

  @IsOptional()
  @IsString()
  notes?: string
}

export class UpdateBankAccountDto {
  @IsOptional()
  @IsString()
  accountName?: string

  @IsOptional()
  @IsString()
  ownerName?: string

  @IsOptional()
  @IsString()
  notes?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
