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
 * Create Purchase Order DTO
 */
export class CreatePurchaseOrderDto {
  @IsNumber()
  @IsNotEmpty({ message: 'Nhà cung cấp là bắt buộc' })
  supplierId!: number

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
  @IsNotEmpty({ message: 'Danh sách sản phẩm là bắt buộc' })
  items!: PurchaseOrderItemDto[]
}
