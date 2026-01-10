
import { IsInt, IsNotEmpty, IsOptional, IsString, IsNumber, Min } from 'class-validator'

export class CreatePayrollDto {
  @IsInt()
  @IsNotEmpty()
  month!: number

  @IsInt()
  @IsNotEmpty()
  year!: number

  @IsString()
  @IsOptional()
  notes?: string
}

export class UpdatePayslipDto {
    @IsNumber()
    @IsOptional()
    bonus?: number

    @IsNumber()
    @IsOptional()
    penalty?: number

    @IsString()
    @IsOptional()
    notes?: string
}

export class PayrollQueryDto {
    @IsOptional()
    @IsInt()
    month?: number

    @IsOptional()
    @IsInt()
    year?: number
}
