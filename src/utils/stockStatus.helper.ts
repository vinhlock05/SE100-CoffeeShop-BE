import { prisma } from '~/config/database'
import { InventoryStockStatus } from '~/enums'

/**
 * Tự động tính toán và cập nhật stockStatus (trạng thái kho) cho InventoryItem
 * Logic ưu tiên:
 * 1. EXPIRED: có batch đã hết hạn và còn số lượng
 * 2. EXPIRING: có batch sắp hết hạn trong 30 ngày và còn số lượng
 * 3. CRITICAL: currentStock = 0 (hết hàng)
 * 4. LOW: currentStock < minStock (sắp hết hàng)
 * 5. GOOD: currentStock >= minStock (đủ hàng)
 */
export async function calculateStockStatus(itemId: number): Promise<InventoryStockStatus> {
  const item = await prisma.inventoryItem.findUnique({
    where: { id: itemId },
    include: {
      inventoryBatches: {
        where: {
          remainingQty: { gt: 0 }
        },
        select: {
          expiryDate: true,
          remainingQty: true
        }
      }
    }
  })

  if (!item) {
    return InventoryStockStatus.CRITICAL
  }

  const currentStock = Number(item.currentStock)
  const minStock = Number(item.minStock || 0)
  const today = new Date()
  const thirtyDaysLater = new Date()
  thirtyDaysLater.setDate(today.getDate() + 30)

  // Check for expired batches (có batch đã hết hạn và còn số lượng)
  const hasExpiredBatch = item.inventoryBatches.some(batch => {
    if (!batch.expiryDate) return false
    return new Date(batch.expiryDate) < today
  })

  if (hasExpiredBatch) {
    return InventoryStockStatus.EXPIRED
  }

  // Check for expiring batches (có batch sắp hết hạn trong 30 ngày)
  const hasExpiringBatch = item.inventoryBatches.some(batch => {
    if (!batch.expiryDate) return false
    const expiryDate = new Date(batch.expiryDate)
    return expiryDate >= today && expiryDate <= thirtyDaysLater
  })

  if (hasExpiringBatch) {
    return InventoryStockStatus.EXPIRING
  }

  // Check stock levels
  if (currentStock <= 0) {
    return InventoryStockStatus.CRITICAL  // Hết hàng
  }

  if (currentStock < minStock) {
    return InventoryStockStatus.LOW  // Sắp hết hàng
  }

  return InventoryStockStatus.GOOD  // Đủ hàng
}

/**
 * Cập nhật stockStatus cho một item
 * Gọi sau khi có thay đổi về tồn kho hoặc batch
 */
export async function updateItemStockStatus(itemId: number): Promise<void> {
  const newStatus = await calculateStockStatus(itemId)
  
  await prisma.inventoryItem.update({
    where: { id: itemId },
    data: { status: newStatus }
  })
}

/**
 * Cập nhật stockStatus cho nhiều items
 * Dùng cho batch operations
 */
export async function updateMultipleItemsStockStatus(itemIds: number[]): Promise<void> {
  for (const itemId of itemIds) {
    await updateItemStockStatus(itemId)
  }
}
