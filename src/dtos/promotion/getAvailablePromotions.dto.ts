import { IsInt, IsOptional } from 'class-validator'

export class GetAvailablePromotionsDto {
    @IsOptional()
    @IsInt()
    customerId?: number

    @IsInt()
    orderId: number
}
