/**
 * Purchase Order Status Enum
 * Trạng thái phiếu nhập hàng
 */
export enum PurchaseOrderStatus {
  /** Phiếu tạm */
  DRAFT = 'draft',
  /** Đã nhập hàng */
  COMPLETED = 'completed',
  /** Đã huỷ */
  CANCELLED = 'cancelled'
}

/**
 * Payment Status Enum
 * Trạng thái thanh toán
 */
export enum PaymentStatus {
  /** Chưa thanh toán */
  UNPAID = 'unpaid',
  /** Thanh toán một phần */
  PARTIAL = 'partial',
  /** Đã thanh toán */
  PAID = 'paid'
}

/**
 * Payment Method Enum
 * Phương thức thanh toán
 */
export enum PaymentMethod {
  /** Tiền mặt */
  CASH = 'cash',
  /** Chuyển khoản */
  TRANSFER = 'transfer'
}
