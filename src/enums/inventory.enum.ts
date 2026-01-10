/**
 * Inventory Stock Status Enum
 * Trạng thái tồn kho (tự động xác định dựa vào currentStock, minStock, và HSD của batches)
 * Giá trị khớp với DB schema
 */
export enum InventoryStockStatus {
  /** Đủ hàng (currentStock >= minStock) */
  GOOD = 'good',
  /** Sắp hết hàng (currentStock < minStock nhưng > 0) */
  LOW = 'low',
  /** Hết hàng (currentStock = 0) */
  CRITICAL = 'critical',
  /** Gần hết hạn (có batch sắp hết hạn trong 30 ngày) */
  EXPIRING = 'expiring',
  /** Đã hết hạn (có batch đã hết hạn) */
  EXPIRED = 'expired'
}

/**
 * Inventory Sale Status Enum
 * Trạng thái bán hàng (user có thể set để quản lý)
 * Giá trị khớp với DB schema (productStatus field)
 */
export enum InventorySaleStatus {
  /** Đang bán */
  SELLING = 'selling',
  /** Bán chạy */
  HOT = 'hot',
  /** Không chạy */
  SLOW = 'slow',
  /** Tạm ngưng */
  PAUSED = 'paused'
}

/**
 * Item Type Enum
 * Loại sản phẩm
 */
export enum ItemType {
  /** Thành phẩm (bán trực tiếp) */
  READY_MADE = 'ready_made',
  /** Sản phẩm pha chế (có công thức) */
  COMPOSITE = 'composite',
  /** Nguyên liệu */
  INGREDIENT = 'ingredient'
}
