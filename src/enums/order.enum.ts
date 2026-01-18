/**
 * Order and OrderItem status enums for POS module
 * Synced with frontend POSOrdering.tsx
 */

// ===========================================
// ORDER STATUS
// ===========================================
// Flow: pending → in_progress → completed
//              ↘ cancelled
export enum OrderStatus {
  PENDING = 'pending',         // Mới tạo, chưa gửi bếp
  IN_PROGRESS = 'in_progress', // Đang chế biến
  COMPLETED = 'completed',     // Hoàn thành
  CANCELLED = 'cancelled'      // Đã hủy
}

// ===========================================
// PAYMENT STATUS
// ===========================================
export enum PaymentStatus {
  UNPAID = 'unpaid',
  PAID = 'paid',
  PARTIAL = 'partial'
}

// ===========================================
// PAYMENT METHOD
// ===========================================
export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  TRANSFER = 'transfer'
}

// ===========================================
// ORDER ITEM STATUS (synced with FE CartItem.status)
// ===========================================
// Flow: pending → preparing → completed → served
//              ↘ out_of_stock / waiting_ingredient / canceled / replaced
export enum OrderItemStatus {
  PENDING = 'pending',                     // Mới thêm, chưa gửi bếp
  PREPARING = 'preparing',                 // Đang chế biến
  COMPLETED = 'completed',                 // Đã làm xong
  SERVED = 'served',                       // Đã phục vụ
  OUT_OF_STOCK = 'out-of-stock',           // Hết nguyên liệu
  WAITING_INGREDIENT = 'waiting-ingredient', // Chờ nguyên liệu
  CANCELED = 'canceled',                   // Đã hủy (FE dùng canceled, không phải cancelled)
  REPLACED = 'replaced'                    // Đã thay thế bằng món khác
}

// ===========================================
// TABLE STATUS
// ===========================================
export enum TableStatus {
  AVAILABLE = 'available',
  OCCUPIED = 'occupied'
}

// ===========================================
// STATUS TRANSITIONS
// ===========================================
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.IN_PROGRESS, OrderStatus.CANCELLED],
  [OrderStatus.IN_PROGRESS]: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.CANCELLED]: []
}

export const ITEM_STATUS_TRANSITIONS: Record<OrderItemStatus, OrderItemStatus[]> = {
  [OrderItemStatus.PENDING]: [
    OrderItemStatus.PREPARING, 
    OrderItemStatus.OUT_OF_STOCK, 
    OrderItemStatus.CANCELED
  ],
  [OrderItemStatus.PREPARING]: [
    OrderItemStatus.COMPLETED, 
    OrderItemStatus.WAITING_INGREDIENT,
    OrderItemStatus.CANCELED
  ],
  [OrderItemStatus.COMPLETED]: [OrderItemStatus.SERVED, OrderItemStatus.CANCELED],
  [OrderItemStatus.SERVED]: [OrderItemStatus.CANCELED],
  [OrderItemStatus.OUT_OF_STOCK]: [OrderItemStatus.REPLACED, OrderItemStatus.CANCELED],
  [OrderItemStatus.WAITING_INGREDIENT]: [OrderItemStatus.PREPARING, OrderItemStatus.CANCELED],
  [OrderItemStatus.CANCELED]: [],
  [OrderItemStatus.REPLACED]: []
}

// ===========================================
// VALIDATION HELPERS
// ===========================================
export function canTransitionOrderStatus(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_STATUS_TRANSITIONS[from]?.includes(to) ?? false
}

export function canTransitionItemStatus(from: OrderItemStatus, to: OrderItemStatus): boolean {
  return ITEM_STATUS_TRANSITIONS[from]?.includes(to) ?? false
}
