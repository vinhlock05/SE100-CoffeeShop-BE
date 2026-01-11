import { IsBoolean, IsNotEmpty, IsEnum } from 'class-validator'
import { OrderItemStatus } from '~/enums/order.enum'

export class UpdateItemStatusDto {
  @IsEnum(OrderItemStatus)
  @IsNotEmpty()
  status!: string

  @IsBoolean()
  all!: boolean
}
