import { IsNumber, IsArray, ValidateNested, Min } from 'class-validator'
import { Type } from 'class-transformer'

export class TransferTableDto {
  @IsNumber()
  newTableId!: number
}

export class MergeOrdersDto {
  @IsNumber()
  fromOrderId!: number
}

class SplitItemDto {
  @IsNumber()
  itemId!: number

  @IsNumber()
  @Min(1)
  quantity!: number
}

export class SplitOrderDto {
  @IsNumber()
  newTableId!: number

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SplitItemDto)
  items!: SplitItemDto[]
}
