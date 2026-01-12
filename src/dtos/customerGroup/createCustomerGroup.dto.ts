import { IsString, IsNotEmpty, IsOptional, IsNumber, Min } from 'class-validator'

export class CreateCustomerGroupDto {
    @IsString()
    @IsNotEmpty({ message: 'Name is required' })
    name!: string

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
