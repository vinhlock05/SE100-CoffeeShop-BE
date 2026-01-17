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
 * - Cho phép cập nhật draft order
 * - status: 'draft' (lưu tạm) hoặc 'completed' (hoàn thành)
 * - bankAccountId: chọn từ DB khi thanh toán bank (chỉ dùng cho finance transaction)
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

  @IsNumber()
  @IsOptional()
  bankAccountId?: number // Only for finance transaction, not stored in PO

  @IsString()
  @IsOptional()
  status?: 'draft' | 'completed' // Save draft or complete immediately

  @IsString()
  @IsOptional()
  notes?: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemDto)
  @IsOptional()
  items?: PurchaseOrderItemDto[]
}
