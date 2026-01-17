import { prisma } from '~/config/database'
import { BadRequestError, NotFoundRequestError } from '~/core/error.response'
import { CreatePurchaseOrderDto, UpdatePurchaseOrderDto, PurchaseOrderQueryDto, PurchaseOrderPaymentDto } from '~/dtos/purchaseOrder'
import { parsePagination, generateCode } from '~/utils/helpers'
import { updateMultipleItemsStockStatus } from '~/utils/stockStatus.helper'
import { Prisma } from '@prisma/client'
import { financeService } from './finance.service'

class PurchaseOrderService {
  /**
   * Calculate payment status based on paid amount
   */
  private getPaymentStatus(totalAmount: number, paidAmount: number): string {
    if (paidAmount >= totalAmount) return 'paid'
    if (paidAmount > 0) return 'partial'
    return 'unpaid'
  }

  /**
   * Create new purchase order (KiotViet-style)
   * - Always creates finance transaction immediately if paidAmount > 0
   * - Always updates supplier totals immediately
   * - If status = 'completed', also updates inventory
   */
  async create(dto: CreatePurchaseOrderDto, staffId?: number) {
    // Validate supplier exists
    const supplier = await prisma.supplier.findFirst({
      where: { id: dto.supplierId, deletedAt: null }
    })
    if (!supplier) {
      throw new BadRequestError({ message: 'Nhà cung cấp không tồn tại' })
    }

    // Validate all items exist
    const itemIds = dto.items.map(item => item.itemId)
    const items = await prisma.inventoryItem.findMany({
      where: { id: { in: itemIds }, deletedAt: null }
    })
    if (items.length !== itemIds.length) {
      throw new BadRequestError({ message: 'Một số sản phẩm không tồn tại' })
    }

    // Calculate totals
    const orderItems = dto.items.map(item => {
      const totalPrice = item.quantity * item.unitPrice
      return {
        ...item,
        totalPrice
      }
    })
    const totalAmount = orderItems.reduce((sum, item) => sum + item.totalPrice, 0)
    const paidAmount = dto.paidAmount || 0
    const debtAmount = totalAmount - paidAmount
    const paymentStatus = this.getPaymentStatus(totalAmount, paidAmount)
    const status = dto.status || 'draft'

    // Create purchase order with items in transaction
    const purchaseOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.purchaseOrder.create({
        data: {
          code: 'TEMP', // Temporary, will be updated
          supplierId: dto.supplierId,
          staffId: staffId || null,
          orderDate: dto.orderDate ? new Date(dto.orderDate) : new Date(),
          status,
          totalAmount: new Prisma.Decimal(totalAmount),
          paidAmount: new Prisma.Decimal(paidAmount),
          debtAmount: new Prisma.Decimal(debtAmount),
          paymentMethod: dto.paymentMethod,
          paymentStatus,
          notes: dto.notes
        }
      })

      // Update with generated code based on ID
      const updatedOrder = await tx.purchaseOrder.update({
        where: { id: order.id },
        data: { code: generateCode('PN', order.id) }
      })

      // Create order items
      await tx.purchaseOrderItem.createMany({
        data: orderItems.map(item => ({
          purchaseOrderId: order.id,
          itemId: item.itemId,
          batchCode: item.batchCode,
          quantity: new Prisma.Decimal(item.quantity),
          unit: item.unit,
          unitPrice: new Prisma.Decimal(item.unitPrice),
          totalPrice: new Prisma.Decimal(item.totalPrice),
          expiryDate: item.expiryDate ? new Date(item.expiryDate) : null
        }))
      })

      // Always update supplier totals on create
      await tx.supplier.update({
        where: { id: dto.supplierId },
        data: {
          totalPurchases: { increment: totalAmount },
          totalDebt: { increment: debtAmount }
        }
      })

      // Create finance transaction if there's payment
      let financeTransactionId: number | null = null
      if (paidAmount > 0) {
        const financeResult = await financeService.createTransaction({
          categoryId: 6, // Tiền trả NCC
          amount: paidAmount,
          paymentMethod: dto.paymentMethod === 'bank' ? 'bank' : 'cash',
          bankAccountId: dto.bankAccountId,
          personType: 'supplier',
          personId: dto.supplierId,
          personName: supplier.name,
          personPhone: supplier.phone || undefined,
          notes: `Thanh toán đơn nhập hàng ${updatedOrder.code}`,
          referenceType: 'purchase_order',
          referenceId: order.id
        }, undefined, tx)
        financeTransactionId = financeResult.id
        
        // Link finance transaction to PO
        await tx.purchaseOrder.update({
          where: { id: order.id },
          data: { financeTransactionId }
        })
      }

      // If completed, update inventory immediately
      if (status === 'completed') {
        await this.updateInventoryForOrder(tx, order.id, dto.supplierId, orderItems)
      }

      return order
    })

    return this.getById(purchaseOrder.id)
  }

  /**
   * Helper: Update inventory for a completed order
   */
  private async updateInventoryForOrder(
    tx: Prisma.TransactionClient,
    orderId: number,
    supplierId: number,
    orderItems: Array<{ itemId: number; batchCode?: string; quantity: number; unit?: string; unitPrice: number; totalPrice: number; expiryDate?: string }>
  ) {
    const order = await tx.purchaseOrder.findUnique({
      where: { id: orderId },
      select: { code: true, orderDate: true }
    })

    for (const item of orderItems) {
      const batchCode = item.batchCode || `${order?.code}-${item.itemId}`

      // Create inventory batch
      await tx.inventoryBatch.create({
        data: {
          itemId: item.itemId,
          supplierId: supplierId,
          purchaseOrderId: orderId,
          batchCode,
          quantity: new Prisma.Decimal(item.quantity),
          remainingQty: new Prisma.Decimal(item.quantity),
          unitCost: new Prisma.Decimal(item.unitPrice),
          entryDate: order?.orderDate || new Date(),
          expiryDate: item.expiryDate ? new Date(item.expiryDate) : null
        }
      })

      // Update item stock
      const inventoryItem = await tx.inventoryItem.findUnique({
        where: { id: item.itemId }
      })

      if (inventoryItem) {
        const currentStock = Number(inventoryItem.currentStock)
        const currentTotalValue = Number(inventoryItem.totalValue)
        const addedQty = item.quantity
        const addedValue = item.totalPrice

        const newStock = currentStock + addedQty
        const newTotalValue = currentTotalValue + addedValue
        const newAvgCost = newStock > 0 ? newTotalValue / newStock : 0

        await tx.inventoryItem.update({
          where: { id: item.itemId },
          data: {
            currentStock: new Prisma.Decimal(newStock),
            totalValue: new Prisma.Decimal(newTotalValue),
            avgUnitCost: new Prisma.Decimal(newAvgCost)
          }
        })
      }
    }

    // Auto-update stockStatus cho các items
    const itemIds = orderItems.map(item => item.itemId)
    setTimeout(() => updateMultipleItemsStockStatus(itemIds), 100)
  }

  /**
   * Get all purchase orders with filters
   */
  async getAll(query: PurchaseOrderQueryDto) {
    const { page, limit, skip } = parsePagination(
      query.page ? Number(query.page) : undefined,
      query.limit ? Number(query.limit) : undefined
    )

    // Build where conditions
    const where: Prisma.PurchaseOrderWhereInput = {}

    if (query.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { supplier: { name: { contains: query.search, mode: 'insensitive' } } }
      ]
    }

    if (query.status) {
      where.status = query.status
    }

    if (query.paymentStatus) {
      where.paymentStatus = query.paymentStatus
    }

    if (query.supplierId) {
      where.supplierId = Number(query.supplierId)
    }

    if (query.fromDate || query.toDate) {
      where.orderDate = {}
      if (query.fromDate) {
        where.orderDate.gte = new Date(query.fromDate)
      }
      if (query.toDate) {
        const toDate = new Date(query.toDate)
        toDate.setHours(23, 59, 59, 999)
        where.orderDate.lte = toDate
      }
    }

    // Build orderBy
    const orderBy = query.sort
      ? (Object.entries(query.sort).map(([key, value]) => ({ [key]: value.toLowerCase() })) as any)
      : { orderDate: 'desc' }

    const [orders, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          supplier: {
            select: { id: true, code: true, name: true }
          },
          staff: {
            select: { id: true, code: true, fullName: true }
          },
          purchaseOrderItems: {
            include: {
              item: {
                select: { id: true, name: true, unit: { select: { symbol: true } } }
              }
            }
          },
          _count: {
            select: { purchaseOrderItems: true }
          }
        }
      }),
      prisma.purchaseOrder.count({ where })
    ])

    return {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      total,
      orders: orders.map(order => ({
        id: order.id,
        code: order.code,
        orderDate: order.orderDate,
        status: order.status,
        paymentStatus: order.paymentStatus,
        supplier: order.supplier,
        staff: order.staff,
        totalAmount: Number(order.totalAmount),
        paidAmount: Number(order.paidAmount),
        debtAmount: Number(order.debtAmount),
        paymentMethod: order.paymentMethod,
        notes: order.notes,
        createdAt: order.createdAt,
        itemCount: order._count.purchaseOrderItems,
        items: order.purchaseOrderItems.map(item => ({
          id: item.id,
          itemId: item.itemId,
          itemName: item.item.name,
          unit: item.unit || item.item.unit?.symbol,
          batchCode: item.batchCode,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          totalPrice: Number(item.totalPrice),
          expiryDate: item.expiryDate
        }))
      }))
    }
  }

  /**
   * Get purchase order by ID with full details
   */
  async getById(id: number) {
    const order = await prisma.purchaseOrder.findFirst({
      where: { id },
      include: {
        supplier: {
          select: { id: true, code: true, name: true, phone: true, address: true }
        },
        staff: {
          select: { id: true, code: true, fullName: true }
        },
        purchaseOrderItems: {
          include: {
            item: {
              select: { id: true, name: true, unit: { select: { name: true, symbol: true } } }
            }
          }
        }
      }
    })

    if (!order) {
      throw new NotFoundRequestError('Không tìm thấy phiếu nhập hàng')
    }

    return {
      id: order.id,
      code: order.code,
      orderDate: order.orderDate,
      status: order.status,
      supplier: order.supplier,
      staff: order.staff,
      totalAmount: Number(order.totalAmount),
      paidAmount: Number(order.paidAmount),
      debtAmount: Number(order.debtAmount),
      paymentMethod: order.paymentMethod,
      bankName: order.bankName,
      bankAccount: order.bankAccount,
      paymentStatus: order.paymentStatus,
      notes: order.notes,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: order.purchaseOrderItems.map(item => ({
        id: item.id,
        itemId: item.itemId,
        itemName: item.item.name,
        unit: item.unit || item.item.unit?.symbol || item.item.unit?.name,
        batchCode: item.batchCode,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
        expiryDate: item.expiryDate
      }))
    }
  }

  /**
   * Update purchase order (only draft orders)
   * - Handles supplier changes (update old and new supplier totals)
   * - Handles payment changes (update finance transaction)
   * - Handles status change to 'completed' (trigger inventory update)
   */
  async update(id: number, dto: UpdatePurchaseOrderDto) {
    const order = await prisma.purchaseOrder.findFirst({
      where: { id },
      include: { 
        purchaseOrderItems: true,
        supplier: true
      }
    })

    if (!order) {
      throw new NotFoundRequestError('Không tìm thấy phiếu nhập hàng')
    }

    if (order.status !== 'draft') {
      throw new BadRequestError({ message: 'Chỉ có thể sửa phiếu tạm' })
    }

    // If updating supplier, validate new supplier exists
    let newSupplier = order.supplier
    const supplierChanged = dto.supplierId && dto.supplierId !== order.supplierId
    if (supplierChanged) {
      const supplier = await prisma.supplier.findFirst({
        where: { id: dto.supplierId, deletedAt: null }
      })
      if (!supplier) {
        throw new BadRequestError({ message: 'Nhà cung cấp không tồn tại' })
      }
      newSupplier = supplier
    }

    // If updating items, validate all items exist
    if (dto.items && dto.items.length > 0) {
      const itemIds = dto.items.map(item => item.itemId)
      const items = await prisma.inventoryItem.findMany({
        where: { id: { in: itemIds }, deletedAt: null }
      })
      if (items.length !== itemIds.length) {
        throw new BadRequestError({ message: 'Một số sản phẩm không tồn tại' })
      }
    }

    // Calculate new totals
    let orderItems = order.purchaseOrderItems.map(item => ({
      itemId: item.itemId,
      batchCode: item.batchCode,
      quantity: Number(item.quantity),
      unit: item.unit,
      unitPrice: Number(item.unitPrice),
      totalPrice: Number(item.totalPrice),
      expiryDate: item.expiryDate?.toISOString()
    }))

    if (dto.items && dto.items.length > 0) {
      orderItems = dto.items.map(item => ({
        ...item,
        totalPrice: item.quantity * item.unitPrice
      }))
    }

    const totalAmount = orderItems.reduce((sum, item) => sum + item.totalPrice, 0)
    // dto.paidAmount là SỐ TIỀN SẼ TRẢ lần này, không phải tổng!
    const paymentThisTime = dto.paidAmount ?? 0  // Số tiền trả lần này
    const oldPaidAmount = Number(order.paidAmount)
    const newTotalPaid = oldPaidAmount + paymentThisTime  // Tổng đã trả = cũ + mới
    const oldTotalAmount = Number(order.totalAmount)
    const oldDebtAmount = Number(order.debtAmount)
    const newDebtAmount = totalAmount - newTotalPaid
    const paymentStatus = this.getPaymentStatus(totalAmount, newTotalPaid)
    const targetStatus = dto.status || 'draft'

    await prisma.$transaction(async (tx) => {
      // 1. Handle items update
      if (dto.items && dto.items.length > 0) {
        await tx.purchaseOrderItem.deleteMany({
          where: { purchaseOrderId: id }
        })
        
        await tx.purchaseOrderItem.createMany({
          data: orderItems.map(item => ({
            purchaseOrderId: id,
            itemId: item.itemId,
            batchCode: item.batchCode,
            quantity: new Prisma.Decimal(item.quantity),
            unit: item.unit,
            unitPrice: new Prisma.Decimal(item.unitPrice),
            totalPrice: new Prisma.Decimal(item.totalPrice),
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : null
          }))
        })
      }

      // 2. Handle supplier change - update totals on both suppliers
      if (supplierChanged) {
        // Subtract from old supplier
        await tx.supplier.update({
          where: { id: order.supplierId },
          data: {
            totalPurchases: { decrement: oldTotalAmount },
            totalDebt: { decrement: oldDebtAmount }
          }
        })
        // Add to new supplier
        await tx.supplier.update({
          where: { id: dto.supplierId! },
          data: {
            totalPurchases: { increment: totalAmount },
            totalDebt: { increment: newDebtAmount }
          }
        })
      } else if (totalAmount !== oldTotalAmount || newDebtAmount !== oldDebtAmount) {
        // Same supplier but amounts changed - update differences
        const totalDiff = totalAmount - oldTotalAmount
        const debtDiff = newDebtAmount - oldDebtAmount
        await tx.supplier.update({
          where: { id: order.supplierId },
          data: {
            totalPurchases: { increment: totalDiff },
            totalDebt: { increment: debtDiff }
          }
        })
      }

      // 3. Handle payment - create NEW transaction for this payment
      // dto.paidAmount = số tiền trả LẦN NÀY (KiotViet style)
      if (paymentThisTime > 0) {
        // Count existing transactions for this PO to determine postfix
        const existingTransactions = await tx.financeTransaction.count({
          where: {
            referenceType: 'purchase_order',
            referenceId: id,
            status: { not: 'cancelled' }
          }
        })
        const postfix = existingTransactions > 0 ? `-${existingTransactions}` : ''
        
        // Create new transaction with this payment amount
        const financeResult = await financeService.createTransaction({
          categoryId: 6, // Tiền trả NCC
          amount: paymentThisTime, // Số tiền trả lần này
          paymentMethod: dto.paymentMethod === 'bank' ? 'bank' : 'cash',
          bankAccountId: dto.bankAccountId,
          personType: 'supplier',
          personId: dto.supplierId ?? order.supplierId,
          personName: newSupplier.name,
          personPhone: newSupplier.phone || undefined,
          notes: `Thanh toán đơn nhập hàng ${order.code}${postfix ? ' (lần ' + (existingTransactions + 1) + ')' : ''}`,
          referenceType: 'purchase_order',
          referenceId: id
        }, undefined, tx)

        // Update financeTransactionId to latest
        await tx.purchaseOrder.update({
          where: { id },
          data: { financeTransactionId: financeResult.id }
        })
      }

      // 4. Update the order
      await tx.purchaseOrder.update({
        where: { id },
        data: {
          supplierId: dto.supplierId ?? order.supplierId,
          orderDate: dto.orderDate ? new Date(dto.orderDate) : undefined,
          paymentMethod: dto.paymentMethod ?? order.paymentMethod,
          notes: dto.notes ?? order.notes,
          status: targetStatus,
          totalAmount: new Prisma.Decimal(totalAmount),
          paidAmount: new Prisma.Decimal(newTotalPaid),
          debtAmount: new Prisma.Decimal(newDebtAmount),
          paymentStatus
        }
      })

      // 5. If status changed to 'completed', update inventory
      if (targetStatus === 'completed') {
        await this.updateInventoryForOrder(tx, id, dto.supplierId ?? order.supplierId, orderItems)
      }
    })

    return this.getById(id)
  }

  /**
   * Complete purchase order - ONLY update inventory
   * (Finance transaction and supplier totals already updated on create)
   */
  async complete(id: number) {
    const order = await prisma.purchaseOrder.findFirst({
      where: { id },
      include: { purchaseOrderItems: true }
    })

    if (!order) {
      throw new NotFoundRequestError('Không tìm thấy phiếu nhập hàng')
    }

    if (order.status === 'completed') {
      throw new BadRequestError({ message: 'Phiếu đã hoàn thành' })
    }

    if (order.status === 'cancelled') {
      throw new BadRequestError({ message: 'Không thể hoàn thành phiếu đã huỷ' })
    }

    // Complete order and update inventory in transaction
    await prisma.$transaction(async (tx) => {
      // Update order status
      await tx.purchaseOrder.update({
        where: { id },
        data: { status: 'completed' }
      })

      // Create inventory batches and update stock for each item
      for (const item of order.purchaseOrderItems) {
        const batchCode = item.batchCode || `${order.code}-${item.id}`

        // Create inventory batch
        await tx.inventoryBatch.create({
          data: {
            itemId: item.itemId,
            supplierId: order.supplierId,
            purchaseOrderId: order.id,
            batchCode,
            quantity: item.quantity,
            remainingQty: item.quantity,
            unitCost: item.unitPrice,
            entryDate: order.orderDate,
            expiryDate: item.expiryDate
          }
        })

        // Update inventory item stock
        const inventoryItem = await tx.inventoryItem.findUnique({
          where: { id: item.itemId }
        })

        if (inventoryItem) {
          const currentStock = Number(inventoryItem.currentStock)
          const currentTotalValue = Number(inventoryItem.totalValue)
          const addedQty = Number(item.quantity)
          const addedValue = Number(item.totalPrice)

          const newStock = currentStock + addedQty
          const newTotalValue = currentTotalValue + addedValue
          const newAvgCost = newStock > 0 ? newTotalValue / newStock : 0

          await tx.inventoryItem.update({
            where: { id: item.itemId },
            data: {
              currentStock: new Prisma.Decimal(newStock),
              totalValue: new Prisma.Decimal(newTotalValue),
              avgUnitCost: new Prisma.Decimal(newAvgCost)
            }
          })
        }
      }
      // Note: Supplier totals and finance transaction already updated on create
    })

    // Auto-update stockStatus cho các items đã nhập
    const itemIds = order.purchaseOrderItems.map(item => item.itemId)
    await updateMultipleItemsStockStatus(itemIds)

    return this.getById(id)
  }

  /**
   * Cancel purchase order (KiotViet-style)
   * - Revert supplier totals (totalPurchases, totalDebt)
   * - Cancel linked finance transaction
   */
  async cancel(id: number) {
    const order = await prisma.purchaseOrder.findFirst({
      where: { id }
    })

    if (!order) {
      throw new NotFoundRequestError('Không tìm thấy phiếu nhập hàng')
    }

    if (order.status === 'completed') {
      throw new BadRequestError({ message: 'Không thể huỷ phiếu đã hoàn thành' })
    }

    if (order.status === 'cancelled') {
      throw new BadRequestError({ message: 'Phiếu đã được huỷ' })
    }

    await prisma.$transaction(async (tx) => {
      // Update PO status
      await tx.purchaseOrder.update({
        where: { id },
        data: { status: 'cancelled' }
      })

      // Revert supplier totals (undo what was done on create)
      await tx.supplier.update({
        where: { id: order.supplierId },
        data: {
          totalPurchases: { decrement: order.totalAmount },
          totalDebt: { decrement: order.debtAmount }
        }
      })

      // Cancel ALL linked finance transactions (not just the one in financeTransactionId)
      await tx.financeTransaction.updateMany({
        where: {
          referenceType: 'purchase_order',
          referenceId: id,
          status: { not: 'cancelled' }
        },
        data: { status: 'cancelled' }
      })
    })

    return { message: 'Huỷ phiếu nhập hàng thành công' }
  }

  /**
   * Add payment to purchase order (for partzial payment scenarios)
   */
  async addPayment(id: number, dto: PurchaseOrderPaymentDto) {
    const order = await prisma.purchaseOrder.findFirst({
      where: { id },
      include: { supplier: { select: { id: true, name: true, phone: true } } }
    })

    if (!order) {
      throw new NotFoundRequestError('Không tìm thấy phiếu nhập hàng')
    }

    if (order.status === 'cancelled') {
      throw new BadRequestError({ message: 'Không thể thanh toán phiếu đã huỷ' })
    }

    const currentDebt = Number(order.debtAmount)
    if (currentDebt <= 0) {
      throw new BadRequestError({ message: 'Phiếu đã thanh toán đủ' })
    }

    if (dto.amount > currentDebt) {
      throw new BadRequestError({ message: `Số tiền thanh toán vượt quá công nợ (${currentDebt}đ)` })
    }

    const newPaidAmount = Number(order.paidAmount) + dto.amount
    const newDebtAmount = Number(order.totalAmount) - newPaidAmount
    const paymentStatus = this.getPaymentStatus(Number(order.totalAmount), newPaidAmount)

    await prisma.$transaction(async (tx) => {
      // Update purchase order
      await tx.purchaseOrder.update({
        where: { id },
        data: {
          paidAmount: new Prisma.Decimal(newPaidAmount),
          debtAmount: new Prisma.Decimal(newDebtAmount),
          paymentStatus,
          paymentMethod: dto.paymentMethod
        }
      })

      // Update supplier debt
      await tx.supplier.update({
        where: { id: order.supplierId },
        data: {
          totalDebt: { decrement: dto.amount }
        }
      })

      // Create finance transaction (Chi - Expense)
      await financeService.createTransaction({
        categoryId: 6, // Tiền trả NCC
        amount: dto.amount,
        paymentMethod: dto.paymentMethod === 'bank' ? 'bank' : 'cash',
        bankAccountId: dto.bankAccountId, // Link to bank account
        personType: 'supplier',
        personId: order.supplierId,
        personName: order.supplier?.name,
        personPhone: order.supplier?.phone || undefined,
        notes: dto.notes || `Thanh toán thêm cho ${order.code}`,
        referenceType: 'purchase_order',
        referenceId: order.id
      }, undefined, tx)
    })

    return this.getById(id)
  }
}

export const purchaseOrderService = new PurchaseOrderService()
