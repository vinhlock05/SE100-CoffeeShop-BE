import { prisma } from '~/config/database'
import { BadRequestError, NotFoundRequestError } from '~/core/error.response'
import { CreatePurchaseOrderDto, UpdatePurchaseOrderDto, PurchaseOrderQueryDto } from '~/dtos/purchaseOrder'
import { parsePagination } from '~/utils/helpers'
import { updateMultipleItemsStockStatus } from '~/utils/stockStatus.helper'
import { Prisma } from '@prisma/client'

class PurchaseOrderService {
  /**
   * Generate next purchase order code (PN001, PN002, ...)
   */
  private async generateCode(): Promise<string> {
    const lastOrder = await prisma.purchaseOrder.findFirst({
      where: { code: { startsWith: 'PN' } },
      orderBy: { code: 'desc' }
    })

    if (!lastOrder) {
      return 'PN001'
    }

    const lastNumber = parseInt(lastOrder.code.replace('PN', ''), 10)
    return `PN${String(lastNumber + 1).padStart(3, '0')}`
  }

  /**
   * Calculate payment status based on paid amount
   */
  private getPaymentStatus(totalAmount: number, paidAmount: number): string {
    if (paidAmount >= totalAmount) return 'paid'
    if (paidAmount > 0) return 'partial'
    return 'unpaid'
  }

  /**
   * Create new purchase order
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

    const code = await this.generateCode()

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

    // Create purchase order with items in transaction
    const purchaseOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.purchaseOrder.create({
        data: {
          code,
          supplierId: dto.supplierId,
          staffId: staffId || null,
          orderDate: dto.orderDate ? new Date(dto.orderDate) : new Date(),
          status: 'draft',
          totalAmount: new Prisma.Decimal(totalAmount),
          paidAmount: new Prisma.Decimal(paidAmount),
          debtAmount: new Prisma.Decimal(debtAmount),
          paymentMethod: dto.paymentMethod,
          bankName: dto.bankName,
          bankAccount: dto.bankAccount,
          paymentStatus,
          notes: dto.notes
        }
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

      return order
    })

    return this.getById(purchaseOrder.id)
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
    let orderBy: Prisma.PurchaseOrderOrderByWithRelationInput = { orderDate: 'desc' }
    if (query.sortBy) {
      const order = query.sortOrder === 'asc' ? 'asc' : 'desc'
      switch (query.sortBy) {
        case 'orderDate':
          orderBy = { orderDate: order }
          break
        case 'totalAmount':
          orderBy = { totalAmount: order }
          break
        case 'code':
          orderBy = { code: order }
          break
      }
    }

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
   * Cho phép cập nhật toàn bộ thông tin bao gồm cả items
   */
  async update(id: number, dto: UpdatePurchaseOrderDto) {
    const order = await prisma.purchaseOrder.findFirst({
      where: { id },
      include: { purchaseOrderItems: true }
    })

    if (!order) {
      throw new NotFoundRequestError('Không tìm thấy phiếu nhập hàng')
    }

    if (order.status !== 'draft') {
      throw new BadRequestError({ message: 'Chỉ có thể sửa phiếu tạm' })
    }

    // If updating supplier, validate it exists
    if (dto.supplierId) {
      const supplier = await prisma.supplier.findFirst({
        where: { id: dto.supplierId, deletedAt: null }
      })
      if (!supplier) {
        throw new BadRequestError({ message: 'Nhà cung cấp không tồn tại' })
      }
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

    await prisma.$transaction(async (tx) => {
      // If items provided, delete old items and create new ones
      if (dto.items && dto.items.length > 0) {
        // Delete old items
        await tx.purchaseOrderItem.deleteMany({
          where: { purchaseOrderId: id }
        })

        // Calculate new totals
        const orderItems = dto.items.map(item => {
          const totalPrice = item.quantity * item.unitPrice
          return { ...item, totalPrice }
        })
        const totalAmount = orderItems.reduce((sum, item) => sum + item.totalPrice, 0)
        const paidAmount = dto.paidAmount ?? Number(order.paidAmount)
        const debtAmount = totalAmount - paidAmount
        const paymentStatus = this.getPaymentStatus(totalAmount, paidAmount)

        // Create new items
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

        // Update order with new totals
        await tx.purchaseOrder.update({
          where: { id },
          data: {
            supplierId: dto.supplierId,
            orderDate: dto.orderDate ? new Date(dto.orderDate) : undefined,
            paymentMethod: dto.paymentMethod,
            bankName: dto.bankName,
            bankAccount: dto.bankAccount,
            notes: dto.notes,
            totalAmount: new Prisma.Decimal(totalAmount),
            paidAmount: new Prisma.Decimal(paidAmount),
            debtAmount: new Prisma.Decimal(debtAmount),
            paymentStatus
          }
        })
      } else {
        // Just update order info without items
        let paidAmount = dto.paidAmount ?? Number(order.paidAmount)
        const totalAmount = Number(order.totalAmount)
        const debtAmount = totalAmount - paidAmount
        const paymentStatus = this.getPaymentStatus(totalAmount, paidAmount)

        await tx.purchaseOrder.update({
          where: { id },
          data: {
            supplierId: dto.supplierId,
            orderDate: dto.orderDate ? new Date(dto.orderDate) : undefined,
            paymentMethod: dto.paymentMethod,
            bankName: dto.bankName,
            bankAccount: dto.bankAccount,
            notes: dto.notes,
            paidAmount: new Prisma.Decimal(paidAmount),
            debtAmount: new Prisma.Decimal(debtAmount),
            paymentStatus
          }
        })
      }
    })

    return this.getById(id)
  }

  /**
   * Complete purchase order - update inventory
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

      // Update supplier totals
      await tx.supplier.update({
        where: { id: order.supplierId },
        data: {
          totalPurchases: { increment: order.totalAmount },
          totalDebt: { increment: order.debtAmount }
        }
      })
    })

    // Auto-update stockStatus cho các items đã nhập
    const itemIds = order.purchaseOrderItems.map(item => item.itemId)
    await updateMultipleItemsStockStatus(itemIds)

    return this.getById(id)
  }

  /**
   * Cancel purchase order
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

    await prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'cancelled' }
    })

    return { message: 'Huỷ phiếu nhập hàng thành công' }
  }
}

export const purchaseOrderService = new PurchaseOrderService()
