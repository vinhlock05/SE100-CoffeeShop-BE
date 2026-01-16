import { IsInt } from 'class-validator'

export class ApplyPromotionDto {
    @IsInt()
    promotionId: number

    @IsInt()
    orderId: number
}

export class UnapplyPromotionDto {
    @IsInt()
    promotionId: number

    @IsInt()
    orderId: number
}
