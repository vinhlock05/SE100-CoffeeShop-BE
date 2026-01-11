import { IsString, IsOptional, IsNumber, Min } from 'class-validator'

export class UpdateCustomerGroupDto {
    @IsOptional()
    @IsString()
    name?: string

    @IsOptional()
    @IsString()
    description?: string

    @IsOptional()
    @IsNumber()
    @Min(0)
    priority?: number

    @IsOptional()
    @IsNumber()
    @Min(0)
    minSpend?: number

    @IsOptional()
    @IsNumber()
    @Min(0)
    minOrders?: number

    @IsOptional()
    @IsNumber()
    @Min(1)
    windowMonths?: number
}
