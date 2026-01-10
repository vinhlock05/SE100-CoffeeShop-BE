/**
 * Write-Off Status Enum
 * Trạng thái phiếu xuất huỷ
 */
export enum WriteOffStatus {
  /** Phiếu tạm */
  DRAFT = 'draft',
  /** Đã hoàn thành */
  COMPLETED = 'completed',
  /** Đã huỷ */
  CANCELLED = 'cancelled'
}

/**
 * Stock Check Status Enum
 * Trạng thái phiên kiểm kê
 */
export enum StockCheckStatus {
  /** Đang kiểm kê */
  IN_PROGRESS = 'in_progress',
  /** Đã hoàn thành */
  COMPLETED = 'completed',
  /** Đã huỷ */
  CANCELLED = 'cancelled'
}
