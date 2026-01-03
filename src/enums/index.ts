// Enums barrel export
// Add enum exports here as they are created

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  DELETED = 'deleted'
}

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PREPARING = 'preparing',
  READY = 'ready',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum PaymentStatus {
  UNPAID = 'unpaid',
  PARTIAL = 'partial',
  PAID = 'paid',
  REFUNDED = 'refunded'
}

export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  TRANSFER = 'transfer',
  MOMO = 'momo',
  VNPAY = 'vnpay'
}

export enum TableStatus {
  AVAILABLE = 'available',
  OCCUPIED = 'occupied',
  RESERVED = 'reserved',
  CLEANING = 'cleaning'
}

export enum InventoryStatus {
  GOOD = 'good',
  LOW = 'low',
  EXPIRING = 'expiring',
  EXPIRED = 'expired',
  CRITICAL = 'critical'
}

export enum ProductStatus {
  SELLING = 'selling',
  PAUSED = 'paused',
  NOT_RUNNING = 'not_running',
  HOT = 'hot'
}

export enum ItemType {
  READY_MADE = 'ready_made',
  COMPOSITE = 'composite',
  INGREDIENT = 'ingredient'
}

export enum PurchaseOrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  SHIPPING = 'shipping',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled'
}

export enum WriteOffStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

export enum StockCheckStatus {
  DRAFT = 'draft',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum StaffStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ON_LEAVE = 'on_leave',
  TERMINATED = 'terminated'
}

export enum PayrollStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  APPROVED = 'approved',
  PAID = 'paid'
}

export enum FinanceTransactionType {
  INCOME = 'Thu',
  EXPENSE = 'Chi'
}
