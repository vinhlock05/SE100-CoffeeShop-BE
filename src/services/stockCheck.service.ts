import { prisma } from '~/config/database'
import { BadRequestError, NotFoundRequestError } from '~/core/error.response'
import { CreateStockCheckDto, UpdateStockCheckDto, StockCheckQueryDto } from '~/dtos/stockCheck'
import { parsePagination, generateCode } from '~/utils/helpers'
import { updateMultipleItemsStockStatus } from '~/utils/stockStatus.helper'
import { Prisma } from '@prisma/client'

class StockCheckService {
  /**
   * Tạo phiên kiểm kê mới
   */
  async create(dto: CreateStockCheckDto, staffId?: number) {
    // Validate all items exist
    const itemIds = dto.items.map(item => item.itemId)
    const items = await prisma.inventoryItem.findMany({
      where: { id: { in: itemIds }, deletedAt: null }
    })
    if (items.length !== itemIds.length) {
      throw new BadRequestError({ message: 'Một số sản phẩm không tồn tại' })
    }

    // Create stock check with items in transaction
    const stockCheck = await prisma.$transaction(async (tx) => {
      // Get system quantities for each item
      const checkItems = await Promise.all(dto.items.map(async (item) => {
        const inventoryItem = await tx.inventoryItem.findUnique({
          where: { id: item.itemId }
        })
        const systemQuantity = Number(inventoryItem?.currentStock || 0)
        const actualQuantity = item.actualQuantity
        const difference = actualQuantity - systemQuantity

        return {
          ...item,
          systemQuantity,
          actualQuantity,
          difference
        }
      }))

      const discrepancyCount = checkItems.filter(item => item.difference !== 0).length

      const record = await tx.stockCheck.create({
        data: {
          code: 'TEMP',
          staffId: staffId || null,
          checkDate: dto.checkDate ? new Date(dto.checkDate) : new Date(),
          notes: dto.notes,
          status: 'in_progress',
          totalItems: dto.items.length,
          discrepancyCount
        }
      })

      // Create stock check items
      for (const item of checkItems) {
        await tx.stockCheckItem.create({
          data: {
            stockCheckId: record.id,
            itemId: item.itemId,
            systemQuantity: new Prisma.Decimal(item.systemQuantity),
            actualQuantity: new Prisma.Decimal(item.actualQuantity),
            difference: new Prisma.Decimal(item.difference),
            unit: item.unit,
            notes: item.notes
          }
        })
      }

      // Update code based on ID
      await tx.stockCheck.update({
        where: { id: record.id },
        data: { code: generateCode('KK', record.id) }
      })

      return record
    })

    return this.getById(stockCheck.id)
  }

  /**
   * Lấy danh sách phiên kiểm kê
   */
  async getAll(query: StockCheckQueryDto) {
    const { page, limit, skip } = parsePagination(
      query.page ? Number(query.page) : undefined,
      query.limit ? Number(query.limit) : undefined
    )

    // Build where conditions
    const where: Prisma.StockCheckWhereInput = {}

    if (query.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { notes: { contains: query.search, mode: 'insensitive' } }
      ]
    }

    if (query.status) {
      where.status = query.status
    }

    if (query.fromDate || query.toDate) {
      where.checkDate = {}
      if (query.fromDate) {
        where.checkDate.gte = new Date(query.fromDate)
      }
      if (query.toDate) {
        const toDate = new Date(query.toDate)
        toDate.setHours(23, 59, 59, 999)
        where.checkDate.lte = toDate
      }
    }

    // Build orderBy
    const orderBy = query.sort
      ? (Object.entries(query.sort).map(([key, value]) => ({ [key]: value.toLowerCase() })) as any)
      : { checkDate: 'desc' }

    const [records, total] = await Promise.all([
      prisma.stockCheck.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          staff: {
            select: { id: true, code: true, fullName: true }
          },
          stockCheckItems: {
            include: {
              item: { select: { id: true, name: true } }
            }
          },
          _count: {
            select: { stockCheckItems: true }
          }
        }
      }),
      prisma.stockCheck.count({ where })
    ])

    return {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      total,
      stockChecks: records.map(record => ({
        id: record.id,
        code: record.code,
        checkDate: record.checkDate,
        status: record.status,
        totalItems: record.totalItems,
        discrepancyCount: record.discrepancyCount,
        notes: record.notes,
        staff: record.staff,
        createdAt: record.createdAt,
        items: record.stockCheckItems.map(item => ({
          itemId: item.itemId,
          itemName: item.item.name,
          unit: item.unit,
          systemQuantity: Number(item.systemQuantity),
          actualQuantity: Number(item.actualQuantity),
          difference: Number(item.difference),
          notes: item.notes
        }))
      }))
    }
  }

  /**
   * Lấy chi tiết phiên kiểm kê
   */
  async getById(id: number) {
    const record = await prisma.stockCheck.findFirst({
      where: { id },
      include: {
        staff: {
          select: { id: true, code: true, fullName: true }
        },
        stockCheckItems: {
          include: {
            item: { 
              select: { 
                id: true, 
                name: true,
                unit: { select: { name: true, symbol: true } }
              } 
            }
          }
        }
      }
    })

    if (!record) {
      throw new NotFoundRequestError('Không tìm thấy phiên kiểm kê')
    }

    return {
      id: record.id,
      code: record.code,
      checkDate: record.checkDate,
      status: record.status,
      totalItems: record.totalItems,
      discrepancyCount: record.discrepancyCount,
      notes: record.notes,
      staff: record.staff,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      items: record.stockCheckItems.map(item => ({
        itemId: item.itemId,
        itemName: item.item.name,
        unit: item.unit || item.item.unit?.symbol,
        systemQuantity: Number(item.systemQuantity),
        actualQuantity: Number(item.actualQuantity),
        difference: Number(item.difference),
        notes: item.notes
      }))
    }
  }

  /**
   * Cập nhật phiên kiểm kê (chỉ phiếu in_progress)
   */
  async update(id: number, dto: UpdateStockCheckDto) {
    const record = await prisma.stockCheck.findFirst({
      where: { id },
      include: { stockCheckItems: true }
    })

    if (!record) {
      throw new NotFoundRequestError('Không tìm thấy phiên kiểm kê')
    }

    if (record.status !== 'in_progress') {
      throw new BadRequestError({ message: 'Chỉ có thể sửa phiên kiểm kê đang tiến hành' })
    }

    // If updating items, validate all exist
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
      if (dto.items && dto.items.length > 0) {
        await tx.stockCheckItem.deleteMany({
          where: { stockCheckId: id }
        })

        const checkItems = await Promise.all(dto.items.map(async (item) => {
          const inventoryItem = await tx.inventoryItem.findUnique({
            where: { id: item.itemId }
          })
          const systemQuantity = Number(inventoryItem?.currentStock || 0)
          const actualQuantity = item.actualQuantity
          const difference = actualQuantity - systemQuantity

          return { ...item, systemQuantity, actualQuantity, difference }
        }))

        const discrepancyCount = checkItems.filter(item => item.difference !== 0).length

        for (const item of checkItems) {
          await tx.stockCheckItem.create({
            data: {
              stockCheckId: id,
              itemId: item.itemId,
              systemQuantity: new Prisma.Decimal(item.systemQuantity),
              actualQuantity: new Prisma.Decimal(item.actualQuantity),
              difference: new Prisma.Decimal(item.difference),
              unit: item.unit,
              notes: item.notes
            }
          })
        }

        await tx.stockCheck.update({
          where: { id },
          data: {
            checkDate: dto.checkDate ? new Date(dto.checkDate) : undefined,
            notes: dto.notes,
            totalItems: dto.items.length,
            discrepancyCount
          }
        })
      } else {
        await tx.stockCheck.update({
          where: { id },
          data: {
            checkDate: dto.checkDate ? new Date(dto.checkDate) : undefined,
            notes: dto.notes
          }
        })
      }
    })

    return this.getById(id)
  }

  /**
   * Hoàn thành phiên kiểm kê - cập nhật tồn kho theo thực tế
   */
  async complete(id: number) {
    const record = await prisma.stockCheck.findFirst({
      where: { id },
      include: { stockCheckItems: true }
    })

    if (!record) {
      throw new NotFoundRequestError('Không tìm thấy phiên kiểm kê')
    }

    if (record.status === 'completed') {
      throw new BadRequestError({ message: 'Phiên kiểm kê đã hoàn thành' })
    }

    if (record.status === 'cancelled') {
      throw new BadRequestError({ message: 'Không thể hoàn thành phiên kiểm kê đã huỷ' })
    }

    // Complete and update inventory stocks
    await prisma.$transaction(async (tx) => {
      await tx.stockCheck.update({
        where: { id },
        data: { status: 'completed' }
      })

      // Update inventory items with actual quantities
      for (const item of record.stockCheckItems) {
        const actualQty = Number(item.actualQuantity)
        
        // Get current item to recalculate avg cost
        const inventoryItem = await tx.inventoryItem.findUnique({
          where: { id: item.itemId }
        })

        if (inventoryItem) {
          const currentAvgCost = Number(inventoryItem.avgUnitCost)
          const newTotalValue = actualQty * currentAvgCost

          await tx.inventoryItem.update({
            where: { id: item.itemId },
            data: {
              currentStock: new Prisma.Decimal(actualQty),
              totalValue: new Prisma.Decimal(newTotalValue)
              // avgUnitCost stays the same
            }
          })
        }
      }
    })

    // Auto-update stockStatus cho các items đã kiểm kê
    const itemIds = record.stockCheckItems.map(item => item.itemId)
    await updateMultipleItemsStockStatus(itemIds)

    return this.getById(id)
  }

  /**
   * Huỷ phiên kiểm kê
   */
  async cancel(id: number) {
    const record = await prisma.stockCheck.findFirst({
      where: { id }
    })

    if (!record) {
      throw new NotFoundRequestError('Không tìm thấy phiên kiểm kê')
    }

    if (record.status === 'completed') {
      throw new BadRequestError({ message: 'Không thể huỷ phiên kiểm kê đã hoàn thành' })
    }

    await prisma.stockCheck.update({
      where: { id },
      data: { status: 'cancelled' }
    })

    return { message: 'Huỷ phiên kiểm kê thành công' }
  }
}

export const stockCheckService = new StockCheckService()
