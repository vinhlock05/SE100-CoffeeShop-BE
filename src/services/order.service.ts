import { prisma } from '~/config/database'
import { BadRequestError, NotFoundRequestError } from '~/core/error.response'
import { CreateOrderDto, UpdateOrderDto, AddOrderItemDto, CheckoutDto, OrderQueryDto, UpdateOrderItemDto, UpdateItemStatusDto } from '~/dtos/order'
import { parsePagination, generateCode } from '~/utils/helpers'
import { Prisma, OrderItem } from '@prisma/client'
import { 
  OrderStatus, 
  PaymentStatus, 
  OrderItemStatus, 
  TableStatus,
  canTransitionItemStatus
} from '~/enums/order.enum'
import { customerService } from './customer.service'
import { promotionService } from './promotion.service'
import { financeService } from './finance.service'

class OrderService {
  /**
   * Create new order
   */
  async create(dto: CreateOrderDto, staffId?: number) {
    // 1. Validate Table
    if (dto.tableId) {
      const table = await prisma.table.findFirst({ where: { id: dto.tableId, deletedAt: null } })
      if (!table) throw new BadRequestError({ message: 'Bàn không tồn tại' })
      if (table.currentStatus === TableStatus.OCCUPIED) throw new BadRequestError({ message: 'Bàn này đã có khách' })
    }

    // 2. Prepare Data
    const itemIds = dto.items.map(i => i.itemId).filter(id => id !== undefined) as number[]
    const comboIds = dto.items.filter(i => i.comboId).map(i => i.comboId) as number[]

    const [dbItems, dbCombos] = await Promise.all([
      prisma.inventoryItem.findMany({ where: { id: { in: itemIds } } }),
      comboIds.length ? prisma.combo.findMany({ 
        where: { id: { in: comboIds }, isActive: true },
        include: { 
          comboGroups: {
            include: { comboItems: true }
          }
        }
      }) : []
    ])

    // Interface for final list
    interface ProcessedItem {
      itemId: number
      comboId?: number
      name: string
      quantity: number
      unitPrice: number
      totalPrice: number
      discountAmount: number
      notes?: string
      customization?: any
      isTopping: boolean
      // attachedToppings to be processed after insert
      attachedToppings?: { itemId: number, name: string, price: number, quantity: number }[]
    }
    const finalItems: ProcessedItem[] = []
    let subtotal = 0

    // 3. Process Items
    // Strategy: Process one by one. If has comboId, validate and calculate pro-rated price.
    
    // Helper to find Combo Info
    const getComboInfo = (comboId: number) => dbCombos.find((c: { id: number }) => c.id === comboId)

    // Collect all topping IDs for batch fetching
    const allToppingIds: number[] = []
    for (const itemDto of dto.items) {
      if (itemDto.attachedToppings) {
        allToppingIds.push(...itemDto.attachedToppings.map((t: { itemId: number }) => t.itemId))
      }
    }
    const dbToppings = allToppingIds.length > 0 
      ? await prisma.inventoryItem.findMany({ where: { id: { in: allToppingIds } } })
      : []

    for (const itemDto of dto.items) {
      if (!itemDto.itemId) continue

      const dbItem = dbItems.find((i: { id: number }) => i.id === itemDto.itemId)
      if (!dbItem) throw new NotFoundRequestError(`Món ID ${itemDto.itemId} không tồn tại`)

      let unitPrice = Number(dbItem.sellingPrice)
      let discountAmount = 0

      // --- COMBO LOGIC ---
      if (itemDto.comboId) {
        const combo = getComboInfo(itemDto.comboId)
        if (!combo) throw new BadRequestError({ message: `Combo ID ${itemDto.comboId} không hợp lệ hoặc đã hết hạn` })

        // Verify item belongs to combo (traverse groups)
        let comboItemRules: any = null
        if ((combo as any).comboGroups) {
          for (const group of (combo as any).comboGroups) {
             const found = group.comboItems.find((ci: any) => ci.itemId === itemDto.itemId)
             if (found) {
               comboItemRules = found
               break
             }
          }
        }
        
        if (!comboItemRules) throw new BadRequestError({ message: `Món ${dbItem.name} không thuộc Combo ${(combo as any).name}` })

        // Calculate Pro-rated Price using ACTUAL sum of selected items
        // Step 1: Calculate sum of sellingPrice for ALL items with same comboId in this order
        const comboItemsInOrder = dto.items.filter((i: any) => i.comboId === itemDto.comboId && i.itemId)
        let actualItemsTotal = 0
        for (const ci of comboItemsInOrder) {
          const ciDbItem = dbItems.find((i: { id: number }) => i.id === ci.itemId)
          if (ciDbItem) {
            actualItemsTotal += Number(ciDbItem.sellingPrice) * (ci.quantity || 1)
          }
        }

        // Step 2: Pro-rate = (thisItemPrice / actualTotal) * comboPrice
        if (actualItemsTotal > 0) {
          unitPrice = (Number(dbItem.sellingPrice) / actualItemsTotal) * Number((combo as any).comboPrice)
          unitPrice = Math.round(unitPrice)
        }
        
        // Add extraPrice if any (upgrade fee)
        if (comboItemRules.extraPrice) {
            unitPrice += Number(comboItemRules.extraPrice)
        }
      }

      const totalPrice = itemDto.quantity * unitPrice

      // Process attachedToppings
      let toppingsData: { itemId: number, name: string, price: number, quantity: number }[] = []
      if (itemDto.attachedToppings && itemDto.attachedToppings.length > 0) {
        for (const tDto of itemDto.attachedToppings) {
          const tItem = dbToppings.find((t: { id: number }) => t.id === tDto.itemId)
          if (!tItem) throw new BadRequestError({ message: `Topping ID ${tDto.itemId} không tồn tại` })
          
          const toppingTotal = tDto.quantity * Number(tItem.sellingPrice)
          toppingsData.push({
            itemId: tItem.id,
            name: tItem.name,
            price: Number(tItem.sellingPrice),
            quantity: tDto.quantity
          })
          // Add topping cost to subtotal
          subtotal += toppingTotal
        }
      }
      
      finalItems.push({
        itemId: itemDto.itemId,
        comboId: itemDto.comboId,
        name: dbItem.name,
        quantity: itemDto.quantity,
        unitPrice: unitPrice,
        totalPrice: totalPrice,
        discountAmount, // Could be used for vouchers later
        notes: itemDto.notes,
        customization: itemDto.customization,
        isTopping: false,
        attachedToppings: toppingsData
      })

      subtotal += totalPrice
    }

    const totalAmount = subtotal

    // 4. Create Order Transaction
    const order = await prisma.$transaction(async (tx: any) => {
      const newOrder = await tx.order.create({
        data: {
          orderCode: 'TEMP',
          tableId: dto.tableId,
          customerId: dto.customerId, // null for walk-in customers
          staffId: staffId,
          status: OrderStatus.PENDING,
          subtotal: subtotal,
          totalAmount: totalAmount,
          notes: dto.notes
        }
      })

      await tx.order.update({
        where: { id: newOrder.id },
        data: { orderCode: generateCode('HD', newOrder.id) }
      })

      // Create items one by one to get IDs for topping parent reference
      for (const item of finalItems) {
        const mainItem = await tx.orderItem.create({
          data: {
            orderId: newOrder.id,
            itemId: item.itemId,
            comboId: item.comboId,
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountAmount: item.discountAmount,
            totalPrice: item.totalPrice,
            status: OrderItemStatus.PENDING,
            customization: item.customization ?? Prisma.JsonNull,
            notes: item.notes,
            isTopping: false
          }
        })

        // Create toppings attached to this main item
        if (item.attachedToppings && item.attachedToppings.length > 0) {
          await tx.orderItem.createMany({
            data: item.attachedToppings.map((t: any) => ({
              orderId: newOrder.id,
              itemId: t.itemId,
              name: t.name,
              quantity: t.quantity,
              unitPrice: t.price,
              totalPrice: t.quantity * t.price,
              status: OrderItemStatus.PENDING,
              isTopping: true,
              parentItemId: mainItem.id
            }))
          })
        }
      }

      if (dto.tableId) {
        await tx.table.update({
          where: { id: dto.tableId },
          data: { currentStatus: TableStatus.OCCUPIED }
        })
      }
      return newOrder
    })

    return this.getById(order.id)
  }

  /**
   * Get order by ID
   */
  async getById(id: number) {
    const order = await prisma.order.findFirst({
      where: { id },
      include: {
        table: { select: { id: true, tableName: true, area: { select: { name: true } } } },
        staff: { select: { id: true, code: true, fullName: true } },
        customer: { select: { id: true, name: true, phone: true } },
        orderItems: {
          where: { status: { not: OrderItemStatus.CANCELED } },
          include: {
            item: { select: { id: true, code: true, name: true, imageUrl: true } },
            toppings: true
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    if (!order) {
      throw new NotFoundRequestError('Đơn hàng không tồn tại')
    }

    // Generate comboSummary for bill printing
    const comboSummary = await this.generateComboSummary(order.orderItems)

    return {
      ...order,
      comboSummary
    }
  }

  /**
   * Generate combo summary for bill printing
   * Groups items by comboId with combo name and total
   */
  private async generateComboSummary(orderItems: any[]) {
    // Group items by comboId
    const comboGroups = new Map<number, any[]>()
    
    for (const item of orderItems) {
      if (item.comboId && !item.isTopping) {
        if (!comboGroups.has(item.comboId)) {
          comboGroups.set(item.comboId, [])
        }
        comboGroups.get(item.comboId)!.push(item)
      }
    }

    if (comboGroups.size === 0) return []

    // Fetch combo info
    const comboIds = Array.from(comboGroups.keys())
    const combos = await prisma.combo.findMany({
      where: { id: { in: comboIds } },
      select: { id: true, name: true, comboPrice: true }
    })

    // Build summary
    const summary = []
    for (const [comboId, items] of comboGroups) {
      const combo = combos.find(c => c.id === comboId)
      const comboTotal = items.reduce((sum: number, i: any) => sum + Number(i.totalPrice), 0)
      
      summary.push({
        comboId,
        comboName: combo?.name || `Combo #${comboId}`,
        comboPrice: combo ? Number(combo.comboPrice) : comboTotal,
        actualTotal: comboTotal,
        items: items.map((i: any) => ({
          id: i.id,
          itemId: i.itemId,
          name: i.name,
          quantity: i.quantity
        }))
      })
    }

    return summary
  }

  /**
   * Get all orders with filters
   */
  async getAll(query: OrderQueryDto) {
    const { page, limit, skip } = parsePagination(
      query.page ? Number(query.page) : undefined,
      query.limit ? Number(query.limit) : undefined
    )

    const where: Prisma.OrderWhereInput = {}

    if (query.search) {
      where.OR = [
        { orderCode: { contains: query.search, mode: 'insensitive' } },
        { notes: { contains: query.search, mode: 'insensitive' } }
      ]
    }

    if (query.status) {
      where.status = query.status
    }

    if (query.paymentStatus) {
      where.paymentStatus = query.paymentStatus
    }

    if (query.tableId) {
      where.tableId = Number(query.tableId)
    }

    if (query.fromDate || query.toDate) {
      where.createdAt = {}
      if (query.fromDate) {
        where.createdAt.gte = new Date(query.fromDate)
      }
      if (query.toDate) {
        const toDate = new Date(query.toDate)
        toDate.setHours(23, 59, 59, 999)
        where.createdAt.lte = toDate
      }
    }

    // Build orderBy
    const orderBy = query.sort
      ? (Object.entries(query.sort).map(([key, value]) => ({ [key]: value.toLowerCase() })) as any)
      : { createdAt: 'desc' }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          table: { select: { id: true, tableName: true } },
          staff: { select: { id: true, code: true, fullName: true } },
          orderItems: {
            where: { status: { not: OrderItemStatus.CANCELED } },
            select: { id: true, name: true, quantity: true, status: true }
          },
          _count: { select: { orderItems: true } }
        }
      }),
      prisma.order.count({ where })
    ])

    return {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      total,
      orders
    }
  }

  /**
   * Update order
   */
  async update(id: number, dto: UpdateOrderDto) {
    await this.getById(id)

    await prisma.order.update({
      where: { id },
      data: {
        tableId: dto.tableId,
        customerId: dto.customerId, // Allow linking customer after order creation
        status: dto.status,
        notes: dto.notes,
        completedAt: dto.status === OrderStatus.COMPLETED ? new Date() : undefined
      }
    })

    return this.getById(id)
  }

  /**
   * Add item to order (with attached toppings)
   */
  async addItem(orderId: number, dto: AddOrderItemDto) {
    const order = await this.getById(orderId)

    if (order.status === OrderStatus.COMPLETED || order.status === OrderStatus.CANCELLED) {
      throw new BadRequestError({ message: 'Không thể thêm món vào đơn hàng đã hoàn thành hoặc đã hủy' })
    }

    // 1. Validate & Get Main Item
    let name = ''
    let unitPrice = 0
    let itemId: number | null = null
    let comboId: number | null = null

    if (dto.itemId) {
      const item = await prisma.inventoryItem.findUnique({ where: { id: dto.itemId } })
      if (!item) throw new NotFoundRequestError('Món không tồn tại')
      
      name = item.name
      unitPrice = Number(item.sellingPrice)
      itemId = dto.itemId

      // --- COMBO LOGIC for addItem ---
      if (dto.comboId) {
        comboId = dto.comboId
        const combo = await prisma.combo.findFirst({
          where: { id: dto.comboId, isActive: true },
          include: { 
            comboGroups: {
              include: { comboItems: true }
            }
          }
        })
        
        if (!combo) throw new BadRequestError({ message: `Combo ID ${dto.comboId} không hợp lệ hoặc đã hết hạn` })
        
        // Verify item belongs to combo
        let comboItemRules: any = null
        if (combo.comboGroups) {
          for (const group of combo.comboGroups) {
             const found = group.comboItems.find(ci => ci.itemId === dto.itemId)
             if (found) {
               comboItemRules = found
               break
             }
          }
        }

        if (!comboItemRules) throw new BadRequestError({ message: `Món ${name} không thuộc Combo ${combo.name}` })

        // Calculate Pro-rated Price using ACTUAL sum (existing items + this new item)
        // Step 1: Get existing combo items in order with same comboId
        const existingComboItems = order.orderItems.filter((oi: any) => oi.comboId === dto.comboId && !oi.isTopping)
        
        // Step 2: Sum their original prices (we need to reverse the pro-rate, so use item.sellingPrice from DB)
        let actualItemsTotal = 0
        for (const oi of existingComboItems) {
          if (oi.itemId) {
            const oiDbItem = await prisma.inventoryItem.findUnique({ where: { id: oi.itemId } })
            if (oiDbItem) {
              actualItemsTotal += Number(oiDbItem.sellingPrice) * oi.quantity
            }
          }
        }
        // Add the new item being added
        actualItemsTotal += Number(item.sellingPrice) * dto.quantity

        // Step 3: Pro-rate = (thisItemPrice / actualTotal) * comboPrice
        if (actualItemsTotal > 0) {
          unitPrice = (Number(item.sellingPrice) / actualItemsTotal) * Number(combo.comboPrice)
          unitPrice = Math.round(unitPrice)
        }

        // Add extraPrice if any (upgrade fee)
        if (comboItemRules.extraPrice) {
            unitPrice += Number(comboItemRules.extraPrice)
        }
      }
    } else {
      throw new BadRequestError({ message: 'Phải cung cấp itemId' })
    }

    // 2. Validate & Get Toppings (if any)
    let toppingsData: { itemId: number, name: string, price: number, quantity: number }[] = []
    
    if (dto.attachedToppings && dto.attachedToppings.length > 0) {
      const toppingIds = dto.attachedToppings.map(t => t.itemId)
      const toppingItems = await prisma.inventoryItem.findMany({
        where: { id: { in: toppingIds } }
      })

      // Map back to preserve quantity from DTO
      for (const tDto of dto.attachedToppings) {
        const tItem = toppingItems.find(i => i.id === tDto.itemId)
        if (!tItem) throw new BadRequestError({ message: `Topping ID ${tDto.itemId} không tồn tại` })
        
        toppingsData.push({
          itemId: tItem.id,
          name: tItem.name,
          price: Number(tItem.sellingPrice),
          quantity: tDto.quantity
        })
      }
    }

    // 3. Calculate Totals
    // Base item total
    const itemTotalPrice = dto.quantity * unitPrice
    
    // Toppings total (just for checking, not added to main item row)
    // const toppingsTotal = toppingsData.reduce((sum, t) => sum + (t.quantity * t.price), 0)
    
    // 4. Create in Transaction
    await prisma.$transaction(async (tx) => {
      // Create main item
      const mainItem = await tx.orderItem.create({
        data: {
          orderId,
          itemId,
          comboId: dto.comboId,
          name,
          quantity: dto.quantity,
          unitPrice: new Prisma.Decimal(unitPrice),
          totalPrice: new Prisma.Decimal(itemTotalPrice),
          status: OrderItemStatus.PENDING,
          customization: dto.customization,
          notes: dto.notes,
          isTopping: false
        }
      })

      // Create attached toppings
      if (toppingsData.length > 0) {
        await tx.orderItem.createMany({
          data: toppingsData.map(t => ({
            orderId,
            itemId: t.itemId,
            name: t.name,
            quantity: t.quantity,
            unitPrice: new Prisma.Decimal(t.price),
            totalPrice: new Prisma.Decimal(t.quantity * t.price),
            status: OrderItemStatus.PENDING,
            isTopping: true,
            parentItemId: mainItem.id
          }))
        })
      }

      // Recalculate order totals
      const items = await tx.orderItem.findMany({ where: { orderId } })
      const subtotal = items
        .filter((i: OrderItem) => i.status !== OrderItemStatus.CANCELED)
        .reduce((sum: number, item: OrderItem) => sum + Number(item.totalPrice), 0)
      
      await tx.order.update({
        where: { id: orderId },
        data: {
          subtotal: new Prisma.Decimal(subtotal),
          totalAmount: new Prisma.Decimal(subtotal)
        }
      })
    })

    return this.getById(orderId)
  }

  /**
   * Remove item from order
   */
  async removeItem(orderId: number, itemId: number) {
    const order = await this.getById(orderId)
    
    if (order.status === OrderStatus.COMPLETED || order.status === OrderStatus.CANCELLED) {
      throw new BadRequestError({ message: 'Không thể xóa món khỏi đơn hàng đã hoàn thành hoặc đã hủy' })
    }

    const item = order.orderItems.find((i: OrderItem) => i.id === itemId)
    if (!item) {
      throw new NotFoundRequestError('Món không tồn tại trong đơn hàng')
    }

    await prisma.$transaction(async (tx) => {
      // Delete toppings first (if any)
      await tx.orderItem.deleteMany({ where: { parentItemId: itemId } })
      
      // Delete item
      await tx.orderItem.delete({ where: { id: itemId } })

      // Recalculate totals
      const items = await tx.orderItem.findMany({ where: { orderId } })
      const subtotal = items
        .filter((i: OrderItem) => i.status !== OrderItemStatus.CANCELED)
        .reduce((sum: number, i: OrderItem) => sum + Number(i.totalPrice), 0)

      await tx.order.update({
        where: { id: orderId },
        data: {
          subtotal: new Prisma.Decimal(subtotal),
          totalAmount: new Prisma.Decimal(subtotal)
        }
      })
    })

    return this.getById(orderId)
  }

  /**
   * Send order to kitchen (update all pending items to preparing)
   */
  async sendToKitchen(orderId: number) {
    await this.getById(orderId)

    await prisma.$transaction(async (tx) => {
      // Update all pending items to preparing
      await tx.orderItem.updateMany({
        where: { orderId, status: OrderItemStatus.PENDING },
        data: { status: OrderItemStatus.PREPARING }
      })

      // Update order status
      await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.IN_PROGRESS }
      })
    })

    return this.getById(orderId)
  }

  /**
   * Checkout order
   */
  async checkout(orderId: number, dto: CheckoutDto) {
    const order = await this.getById(orderId)

    if (order.paymentStatus === PaymentStatus.PAID) {
      throw new BadRequestError({ message: 'Đơn hàng đã thanh toán' })
    }

    const totalAmount = Number(order.totalAmount)
    const paidAmount = dto.paidAmount
    const changeAmount = paidAmount - totalAmount

    if (paidAmount < totalAmount) {
      throw new BadRequestError({ message: `Số tiền thanh toán không đủ. Cần thanh toán: ${totalAmount}đ` })
    }

    await prisma.$transaction(async (tx) => {
      // Update order payment
      await tx.order.update({
        where: { id: orderId },
        data: {
          paymentMethod: dto.paymentMethod,
          paymentStatus: PaymentStatus.PAID,
          paidAmount: new Prisma.Decimal(paidAmount),
          status: OrderStatus.COMPLETED,
          completedAt: new Date()
        }
      })

      // Release table if dine-in
      if (order.tableId) {
        await tx.table.update({
          where: { id: order.tableId },
          data: { currentStatus: TableStatus.AVAILABLE }
        })
      }

      // Update customer stats if member (customerId can be null for walk-in)
      if (order.customerId) {
        await tx.customer.update({
          where: { id: order.customerId },
          data: {
            totalOrders: { increment: 1 },
            totalSpent: { increment: Number(order.totalAmount) }
          }
        })

        // Auto-reassign customer group based on new stats (upgrade/downgrade tier)
        await customerService.assignCustomerGroup(order.customerId, tx)
      }

      // Create finance transaction (Thu - Receipt) linked to this order
      // Category ID 1 = 'Tiền khách trả' (Customer Payment)
      await financeService.createTransaction({
        categoryId: 1, // Tiền khách trả
        amount: totalAmount,
        paymentMethod: dto.paymentMethod === 'cash' ? 'cash' : 'bank',
        bankAccountId: dto.bankAccountId,
        personType: order.customerId ? 'customer' : undefined,
        personId: order.customerId || undefined,
        personName: order.customer?.name,
        personPhone: order.customer?.phone,
        notes: `Thu tiền đơn hàng ${order.orderCode}`,
        referenceType: 'order',
        referenceId: orderId
      }, undefined, tx)
    })

    return {
      order: await this.getById(orderId),
      totalAmount,
      paidAmount,
      changeAmount
    }
  }

  /**
   * Cancel order
   */
  async cancel(orderId: number, reason?: string) {
    const order = await this.getById(orderId)

    if (order.status === OrderStatus.COMPLETED) {
      throw new BadRequestError({ message: 'Không thể hủy đơn hàng đã hoàn thành' })
    }

    // If promotion was applied, remove it first (before transaction)
    if (order.promotionId) {
      await promotionService.unapplyPromotion(order.promotionId, orderId)
    }

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.CANCELLED,
          promotionId: null, // Clear promotion reference
          discountAmount: 0, // Reset discount
          notes: reason ? `${order.notes || ''}\n[Lý do hủy]: ${reason}` : order.notes
        }
      })

      // Release table if dine-in
      if (order.tableId) {
        await tx.table.update({
          where: { id: order.tableId },
          data: { currentStatus: TableStatus.AVAILABLE }
        })
      }
    })

    return this.getById(orderId)
  }

  /**
   * Get current active order by table (for POS)
   * Returns the most recent unpaid order for a table, or null if none
   */
  async getByTable(tableId: number) {
    const order = await prisma.order.findFirst({
      where: {
        tableId,
        status: { notIn: [OrderStatus.COMPLETED, OrderStatus.CANCELLED] },
        paymentStatus: PaymentStatus.UNPAID
      },
      include: {
        table: { select: { id: true, tableName: true, capacity: true } },
        staff: { select: { id: true, code: true, fullName: true } },
        orderItems: {
          where: { status: { not: OrderItemStatus.CANCELED } },
          include: {
            item: { select: { id: true, code: true, name: true, imageUrl: true, sellingPrice: true } },
            toppings: true
          },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return order
  }



  // ========================================
  // NEW: Enhanced Item Management
  // ========================================

  /**
   * Update order item (quantity, notes, customization, status)
   */
  async updateOrderItem(orderId: number, itemId: number, dto: UpdateOrderItemDto) {
    const order = await this.getById(orderId)
    const item = order.orderItems.find((i: OrderItem) => i.id === itemId)
    
    if (!item) {
      throw new NotFoundRequestError('Món không tồn tại trong đơn hàng')
    }

    if (dto.status) {
      const currentStatus = item.status as OrderItemStatus
      const newStatus = dto.status as OrderItemStatus
      if (!canTransitionItemStatus(currentStatus, newStatus)) {
        throw new BadRequestError({ 
          message: `Không thể chuyển trạng thái từ "${currentStatus}" sang "${newStatus}"` 
        })
      }
    }

    await prisma.$transaction(async (tx) => {
      const updateData: any = {}
      
      if (dto.notes !== undefined) updateData.notes = dto.notes
      if (dto.customization !== undefined) updateData.customization = dto.customization
      if (dto.status) updateData.status = dto.status
      
      let currentQuantity = item.quantity
      if (dto.quantity !== undefined && dto.quantity !== item.quantity) {
        currentQuantity = dto.quantity
        updateData.quantity = currentQuantity
        updateData.totalPrice = new Prisma.Decimal(currentQuantity * Number(item.unitPrice))
      }

      if (dto.attachedToppings) {
        await tx.orderItem.deleteMany({ where: { parentItemId: itemId } })

        if (dto.attachedToppings.length > 0) {
          // Fetch toppings from DB to get coreect name & price
          const toppingIds = dto.attachedToppings.map(t => t.itemId)
          const dbToppings = await prisma.inventoryItem.findMany({
            where: { id: { in: toppingIds } }
          })

          const finalToppings = dto.attachedToppings.map(toppingDto => {
            const dbTopping = dbToppings.find(t => t.id === toppingDto.itemId)
            if (!dbTopping) throw new NotFoundRequestError(`Topping ID ${toppingDto.itemId} không tồn tại`)
            
            const unitPrice = Number(dbTopping.sellingPrice) || 0
            
            return {
              orderId,
              itemId: toppingDto.itemId,
              name: dbTopping.name,
              quantity: toppingDto.quantity,
              unitPrice: new Prisma.Decimal(unitPrice),
              totalPrice: new Prisma.Decimal(unitPrice * toppingDto.quantity),
              status: OrderItemStatus.PENDING,
              isTopping: true,
              parentItemId: itemId
            }
          })

          await tx.orderItem.createMany({ data: finalToppings })
        }
      }

      if (Object.keys(updateData).length > 0) {
        await tx.orderItem.update({
          where: { id: itemId },
          data: updateData
        })
      }

      // Recalculate order totals if quantity changed or toppings updated
      if (dto.quantity !== undefined || dto.attachedToppings) {
        const items = await tx.orderItem.findMany({ where: { orderId } })
        const subtotal = items
          .filter((i: OrderItem) => i.status !== OrderItemStatus.CANCELED)
          .reduce((sum: number, i: OrderItem) => sum + Number(i.totalPrice), 0)
        
        await tx.order.update({
          where: { id: orderId },
          data: { 
            subtotal: new Prisma.Decimal(subtotal), 
            totalAmount: new Prisma.Decimal(subtotal) 
          }
        })
      }
    })

    return this.getById(orderId)
  }


  /**
   * Reduce or cancel item (with quantity and reason)
   * Instead of deleting, we split and mark as 'canceled' for audit purposes
   */
  async reduceItem(orderId: number, itemId: number, dto: { quantity?: number, reason: string }) {
    const order = await this.getById(orderId)
    const item = order.orderItems.find((i: OrderItem) => i.id === itemId)
    
    if (!item) {
      throw new NotFoundRequestError('Món không tồn tại trong đơn hàng')
    }

    if (order.status === OrderStatus.COMPLETED || order.status === OrderStatus.CANCELLED) {
      throw new BadRequestError({ message: 'Không thể thay đổi đơn hàng đã hoàn thành hoặc đã hủy' })
    }

    // Validate status transition
    const currentStatus = item.status as OrderItemStatus
    if (!canTransitionItemStatus(currentStatus, OrderItemStatus.CANCELED)) {
      throw new BadRequestError({ 
        message: `Không thể hủy món có trạng thái "${currentStatus}"` 
      })
    }

    const cancelQuantity = dto.quantity || item.quantity
    const cancelReason = `[Hủy: ${dto.reason}]`

    await prisma.$transaction(async (tx) => {
      // Case 1: Cancel entire item (quantity >= current)
      if (cancelQuantity >= item.quantity) {
        // Update item status to canceled (keep totalPrice for reporting)
        await tx.orderItem.update({
          where: { id: itemId },
          data: {
            status: OrderItemStatus.CANCELED,
            notes: item.notes ? `${item.notes}\n${cancelReason}` : cancelReason
          }
        })

        // Also cancel attached toppings (keep totalPrice for reporting)
        await tx.orderItem.updateMany({
          where: { parentItemId: itemId },
          data: {
            status: OrderItemStatus.CANCELED
          }
        })
      } 
      // Case 2: Partial cancel - Split into 2 items
      else {
        const remainQuantity = item.quantity - cancelQuantity

        // Update original item with remaining quantity
        await tx.orderItem.update({
          where: { id: itemId },
          data: {
            quantity: remainQuantity,
            totalPrice: new Prisma.Decimal(remainQuantity * Number(item.unitPrice))
          }
        })

        // Create new item for canceled portion (keep totalPrice for reporting)
        await tx.orderItem.create({
          data: {
            orderId,
            itemId: item.itemId,
            comboId: item.comboId,
            name: item.name,
            quantity: cancelQuantity,
            unitPrice: item.unitPrice,
            totalPrice: new Prisma.Decimal(cancelQuantity * Number(item.unitPrice)),
            status: OrderItemStatus.CANCELED,
            notes: cancelReason,
            customization: item.customization ?? Prisma.JsonNull,
            isTopping: false
          }
        })

        // Note: Toppings stay with original item (not split)
      }

      // Recalculate order totals (exclude canceled items)
      const items = await tx.orderItem.findMany({ where: { orderId } })
      const subtotal = items
        .filter((i: OrderItem) => i.status !== OrderItemStatus.CANCELED)
        .reduce((sum: number, i: OrderItem) => sum + Number(i.totalPrice), 0)
      await tx.order.update({
        where: { id: orderId },
        data: { subtotal: new Prisma.Decimal(subtotal), totalAmount: new Prisma.Decimal(subtotal) }
      })
    })

    return this.getById(orderId)
  }

  /**
   * Update status for single item (Split logic support)
   */
  async updateItemStatus(itemId: number, dto: UpdateItemStatusDto) {
    const { status, all } = dto
    const newStatus = status as OrderItemStatus
    const updateQuantity = 1

    return prisma.$transaction(async (tx) => {
      const originalItem = await tx.orderItem.findUnique({
        where: { id: itemId },
        include: { toppings: true }
      })

      if (!originalItem) throw new NotFoundRequestError('Không tìm thấy món')

      // Validate transition
      if (!canTransitionItemStatus(originalItem.status as OrderItemStatus, newStatus)) {
        throw new BadRequestError({
          message: `Không thể chuyển "${originalItem.name}" từ "${originalItem.status}" sang "${newStatus}"`
        })
      }

      // Logic A: Update All 
      // (If user checks 'all', OR quantity covers remaining amount)
      if (all || updateQuantity >= originalItem.quantity) {
        await tx.orderItem.update({
          where: { id: itemId },
          data: { status: newStatus }
        })
        
        // Sync toppings
        await tx.orderItem.updateMany({
          where: { parentItemId: itemId },
          data: { status: newStatus }
        })
        
        return { updated: 1, status: newStatus, mode: 'full' }
      }

      // Logic B: Split (Partial Update)
      // 1. Reduce original
      const remainQuantity = originalItem.quantity - updateQuantity
      await tx.orderItem.update({
        where: { id: itemId },
        data: {
          quantity: remainQuantity,
          totalPrice: new Prisma.Decimal(remainQuantity * Number(originalItem.unitPrice))
        }
      })

      // 2. Create New Item (Completed part)
      const newItem = await tx.orderItem.create({
        data: {
          orderId: originalItem.orderId,
          itemId: originalItem.itemId,
          name: originalItem.name,
          quantity: updateQuantity,
          unitPrice: originalItem.unitPrice,
          totalPrice: new Prisma.Decimal(updateQuantity * Number(originalItem.unitPrice)),
          status: newStatus,
          notes: originalItem.notes,
          customization: originalItem.customization ?? Prisma.JsonNull,
          isTopping: false
        }
      })

      // 3. Split Toppings
      if (originalItem.toppings.length > 0) {
        for (const top of originalItem.toppings) {
          const topRemain = top.quantity - updateQuantity
          
          await tx.orderItem.update({
            where: { id: top.id },
            data: {
              quantity: topRemain,
              totalPrice: new Prisma.Decimal(topRemain * Number(top.unitPrice))
            }
          })

          await tx.orderItem.create({
            data: {
              orderId: top.orderId,
              itemId: top.itemId,
              name: top.name,
              quantity: updateQuantity,
              unitPrice: top.unitPrice,
              totalPrice: new Prisma.Decimal(updateQuantity * Number(top.unitPrice)),
              status: newStatus,
              isTopping: true,
              parentItemId: newItem.id,
              notes: top.notes
            }
          })
        }
      }

      return { updated: 1, status: newStatus, mode: 'split', newId: newItem.id }
    })
  }

  // ========================================
  // NEW: Kitchen Display
  // ========================================

  /**
   * Get items for kitchen display
   */
  async getKitchenItems(query: { status?: string, groupBy?: string }) {
    const statusFilter = query.status === 'all' 
      ? { in: [OrderItemStatus.PENDING, OrderItemStatus.PREPARING, OrderItemStatus.COMPLETED] }
      : query.status === 'completed'
        ? OrderItemStatus.COMPLETED
        : { in: [OrderItemStatus.PENDING, OrderItemStatus.PREPARING] }

    const items = await prisma.orderItem.findMany({
      where: {
        status: statusFilter,
        order: { status: OrderStatus.IN_PROGRESS },
        isTopping: false
      },
      include: {
        order: {
          select: { id: true, orderCode: true, tableId: true, createdAt: true,
            table: { select: { tableName: true } }
          }
        },
        item: { select: { id: true, code: true, name: true, imageUrl: true } },
        toppings: { select: { name: true } }
      },
      orderBy: { createdAt: 'asc' }
    })

    // Map to kitchen-friendly format
    return items.map(item => ({
      id: item.id,
      orderId: item.order.id,
      orderCode: item.order.orderCode,
      table: item.order.table?.tableName || 'Mang về',
      itemName: item.name,
      quantity: item.quantity,
      customization: item.customization,
      toppings: item.toppings.map(t => t.name),
      notes: item.notes,
      status: item.status,
      createdAt: item.createdAt,
      elapsedMinutes: Math.floor((Date.now() - item.createdAt.getTime()) / 60000)
    }))
  }

  /**
   * Get recipe for an item
   */
  async getItemRecipe(itemId: number) {
    const orderItem = await prisma.orderItem.findFirst({
      where: { id: itemId },
      include: {
        item: {
          include: {
            ingredientOf: {
              include: { ingredientItem: { select: { name: true } } }
            }
          }
        }
      }
    })

    if (!orderItem?.item) {
      throw new NotFoundRequestError('Không tìm thấy công thức')
    }

    return {
      itemName: orderItem.item.name,
      ingredients: orderItem.item.ingredientOf.map(ing => ({
        name: ing.ingredientItem.name,
        quantity: `${ing.quantity} ${ing.unit}`
      }))
    }
  }

  /**
   * Report item out of stock
   */
  async reportOutOfStock(itemId: number, dto: { ingredients?: string[], reason?: string }) {
    await prisma.orderItem.update({
      where: { id: itemId },
      data: {
        status: OrderItemStatus.OUT_OF_STOCK,
        notes: dto.reason || `Hết nguyên liệu: ${dto.ingredients?.join(', ') || 'Không xác định'}`
      }
    })

    return { message: 'Đã báo hết hàng' }
  }

  // ========================================
  // NEW: Table Operations
  // ========================================

  /**
   * Transfer order to new table
   */
  async transferTable(orderId: number, newTableId: number) {
    const order = await this.getById(orderId)

    // Validate new table
    const newTable = await prisma.table.findFirst({
      where: { id: newTableId, deletedAt: null }
    })
    if (!newTable) throw new BadRequestError({ message: 'Bàn không tồn tại' })
    if (newTable.currentStatus === TableStatus.OCCUPIED) {
      throw new BadRequestError({ message: 'Bàn mới đã có khách' })
    }

    await prisma.$transaction(async (tx) => {
      // Release old table
      if (order.tableId) {
        await tx.table.update({
          where: { id: order.tableId },
          data: { currentStatus: TableStatus.AVAILABLE }
        })
      }
      // Occupy new table
      await tx.table.update({
        where: { id: newTableId },
        data: { currentStatus: TableStatus.OCCUPIED }
      })
      // Update order
      await tx.order.update({
        where: { id: orderId },
        data: { tableId: newTableId }
      })
    })

    return this.getById(orderId)
  }

  /**
   * Merge another order into this one
   */
  async mergeOrders(orderId: number, fromOrderId: number) {
    const targetOrder = await this.getById(orderId)
    const sourceOrder = await this.getById(fromOrderId)

    if (sourceOrder.status === OrderStatus.COMPLETED) {
      throw new BadRequestError({ message: 'Không thể gộp đơn đã hoàn thành' })
    }

    await prisma.$transaction(async (tx) => {
      // Move all items from source to target
      await tx.orderItem.updateMany({
        where: { orderId: fromOrderId },
        data: { orderId: orderId }
      })

      // Cancel source order
      await tx.order.update({
        where: { id: fromOrderId },
        data: { status: OrderStatus.CANCELLED, notes: `Đã gộp vào đơn ${targetOrder.orderCode}` }
      })

      // Release source table
      if (sourceOrder.tableId) {
        await tx.table.update({
          where: { id: sourceOrder.tableId },
          data: { currentStatus: TableStatus.AVAILABLE }
        })
      }

      // Recalculate target totals
      const items = await tx.orderItem.findMany({ where: { orderId } })
      const subtotal = items
        .filter((i: OrderItem) => i.status !== OrderItemStatus.CANCELED)
        .reduce((sum: number, i: OrderItem) => sum + Number(i.totalPrice), 0)
      await tx.order.update({
        where: { id: orderId },
        data: { subtotal: new Prisma.Decimal(subtotal), totalAmount: new Prisma.Decimal(subtotal) }
      })
    })

    return this.getById(orderId)
  }

  /**
   * Split items to a new order
   */
  async splitOrder(orderId: number, dto: { newTableId: number, items: { itemId: number, quantity: number }[] }) {
    const order = await this.getById(orderId)
    
    // Validate new table
    const newTable = await prisma.table.findFirst({
      where: { id: dto.newTableId, deletedAt: null }
    })
    if (!newTable) throw new BadRequestError({ message: 'Bàn không tồn tại' })
    if (newTable.currentStatus === TableStatus.OCCUPIED) {
      throw new BadRequestError({ message: 'Bàn mới đã có khách' })
    }

    const newOrder = await prisma.$transaction(async (tx) => {
      // Create new order
      const created = await tx.order.create({
        data: {
          orderCode: 'TEMP',
          tableId: dto.newTableId,
          staffId: order.staffId,
          status: order.status,
          subtotal: new Prisma.Decimal(0),
          totalAmount: new Prisma.Decimal(0)
        }
      })

      await tx.order.update({
        where: { id: created.id },
        data: { orderCode: generateCode('HD', created.id) }
      })

      // Process split items
      for (const splitItem of dto.items) {
        const item = order.orderItems.find((i: OrderItem) => i.id === splitItem.itemId)
        if (!item) continue

        if (splitItem.quantity >= item.quantity) {
          // Move entire item
          await tx.orderItem.update({
            where: { id: item.id },
            data: { orderId: created.id }
          })
        } else {
          // Reduce from original and create new
          const newQty = item.quantity - splitItem.quantity
          await tx.orderItem.update({
            where: { id: item.id },
            data: {
              quantity: newQty,
              totalPrice: new Prisma.Decimal(newQty * Number(item.unitPrice))
            }
          })
          await tx.orderItem.create({
            data: {
              orderId: created.id,
              itemId: item.itemId,
              name: item.name,
              quantity: splitItem.quantity,
              unitPrice: item.unitPrice,
              totalPrice: new Prisma.Decimal(splitItem.quantity * Number(item.unitPrice)),
              status: item.status,
              customization: item.customization || undefined,
              notes: item.notes
            }
          })
        }
      }

      // Recalculate both orders
      for (const oid of [orderId, created.id]) {
        const items = await tx.orderItem.findMany({ where: { orderId: oid } })
        const subtotal = items
          .filter((i: OrderItem) => i.status !== OrderItemStatus.CANCELED)
          .reduce((sum: number, i: OrderItem) => sum + Number(i.totalPrice), 0)
        await tx.order.update({
          where: { id: oid },
          data: { subtotal: new Prisma.Decimal(subtotal), totalAmount: new Prisma.Decimal(subtotal) }
        })
      }

      // Occupy new table
      await tx.table.update({
        where: { id: dto.newTableId },
        data: { currentStatus: TableStatus.OCCUPIED }
      })

      return created
    })

    return { originalOrder: await this.getById(orderId), newOrder: await this.getById(newOrder.id) }
  }

  /**
   * Get order history for a table
   */
  async getTableHistory(tableId: number) {
    const orders = await prisma.order.findMany({
      where: {
        tableId,
        status: { in: [OrderStatus.COMPLETED, OrderStatus.CANCELLED] }
      },
      include: {
        staff: { select: { fullName: true } },
        _count: { select: { orderItems: true } }
      },
      orderBy: { completedAt: 'desc' },
      take: 10
    })

    return orders
  }
}

export const orderService = new OrderService()

