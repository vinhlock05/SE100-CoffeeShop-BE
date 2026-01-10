/**
 * Price Base Type Enum
 * Loại giá cơ sở để tính giá mới
 */
export enum PriceBaseType {
  /** Giá hiện tại (sellingPrice) */
  CURRENT = 'current',
  /** Giá vốn (avgUnitCost) */
  COST = 'cost',
  /** Giá nhập cuối (từ batch gần nhất) */
  LAST_PURCHASE = 'lastPurchase'
}

/**
 * Adjustment Type Enum
 * Loại điều chỉnh giá
 */
export enum AdjustmentType {
  /** Cộng/trừ số tiền cố định (VNĐ) */
  AMOUNT = 'amount',
  /** Cộng/trừ theo phần trăm (%) */
  PERCENT = 'percent'
}
