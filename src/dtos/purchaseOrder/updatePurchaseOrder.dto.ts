import { 
  IsNumber, IsNotEmpty, IsOptional, IsString, IsArray, 
  ValidateNested, IsEnum, IsDateString 
} from 'class-validator'
import { Type } from 'class-transformer'
import { PaymentMethod } from '~/enums'

/**
 * Purchase Order Item DTO
 */
class PurchaseOrderItemDto {
  @IsNumber()
  @IsNotEmpty({ message: 'Mã sản phẩm là bắt buộc' })
  itemId!: number

  @IsString()
  @IsOptional()
  batchCode?: string

  @IsNumber()
  @IsNotEmpty({ message: 'Số lượng là bắt buộc' })
  quantity!: number

  @IsString()
  @IsOptional()
  unit?: string

  @IsNumber()
  @IsNotEmpty({ message: 'Đơn giá là bắt buộc' })
  unitPrice!: number

  @IsDateString()
  @IsOptional()
  expiryDate?: string
}

/**
 * Update Purchase Order DTO
 * Cho phép update toàn bộ thông tin như create
 */
export class UpdatePurchaseOrderDto {
  @IsNumber()
  @IsOptional()
  supplierId?: number

  @IsDateString()
  @IsOptional()
  orderDate?: string

  @IsNumber()
  @IsOptional()
  paidAmount?: number

  @IsEnum(PaymentMethod, { message: 'Phương thức thanh toán không hợp lệ' })
  @IsOptional()
  paymentMethod?: PaymentMethod

  @IsString()
  @IsOptional()
  bankName?: string

  @IsString()
  @IsOptional()
  bankAccount?: string

  @IsString()
  @IsOptional()
  notes?: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemDto)
  @IsOptional()
  items?: PurchaseOrderItemDto[]
}
