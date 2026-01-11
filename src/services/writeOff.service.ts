import { prisma } from '~/config/database'
import { BadRequestError, NotFoundRequestError } from '~/core/error.response'
import { CreateWriteOffDto, UpdateWriteOffDto, WriteOffQueryDto } from '~/dtos/writeOff'
import { parsePagination, generateCode } from '~/utils/helpers'
import { updateMultipleItemsStockStatus } from '~/utils/stockStatus.helper'
import { Prisma } from '@prisma/client'

class WriteOffService {
  /**
   * Tạo phiếu xuất huỷ mới
   */
  async create(dto: CreateWriteOffDto, staffId?: number) {
    // Validate all items and batches exist
    for (const item of dto.items) {
      const batch = await prisma.inventoryBatch.findFirst({
        where: { id: item.batchId, itemId: item.itemId }
      })
      if (!batch) {
        throw new BadRequestError({ message: `Lô hàng ${item.batchId} không tồn tại hoặc không thuộc sản phẩm ${item.itemId}` })
      }
      if (Number(batch.remainingQty) < item.quantity) {
        throw new BadRequestError({ message: `Lô hàng ${item.batchId} không đủ số lượng. Còn lại: ${batch.remainingQty}` })
      }
    }

    // Calculate totals
    const writeOffItems = dto.items.map(item => {
      const unitCost = item.unitCost || 0
      const totalValue = item.quantity * unitCost
      return { ...item, unitCost, totalValue }
    })
    const totalValue = writeOffItems.reduce((sum, item) => sum + item.totalValue, 0)

    // Create write-off with items in transaction
    const writeOff = await prisma.$transaction(async (tx) => {
      const record = await tx.writeOff.create({
        data: {
          code: 'TEMP',
          staffId: staffId || null,
          writeOffDate: dto.writeOffDate ? new Date(dto.writeOffDate) : new Date(),
          reason: dto.reason,
          notes: dto.notes,
          status: 'draft',
          totalValue: new Prisma.Decimal(totalValue)
        }
      })

      // Create write-off items
      for (const item of writeOffItems) {
        await tx.writeOffItem.create({
          data: {
            writeOffId: record.id,
            itemId: item.itemId,
            batchId: item.batchId,
            quantity: new Prisma.Decimal(item.quantity),
            unit: item.unit,
            unitCost: new Prisma.Decimal(item.unitCost),
            totalValue: new Prisma.Decimal(item.totalValue),
            reason: item.reason
          }
        })
      }

      // Update code based on ID
      await tx.writeOff.update({
        where: { id: record.id },
        data: { code: generateCode('XH', record.id) }
      })

      return record
    })

    return this.getById(writeOff.id)
  }

  /**
   * Lấy danh sách phiếu xuất huỷ
   */
  async getAll(query: WriteOffQueryDto) {
    const { page, limit, skip } = parsePagination(
      query.page ? Number(query.page) : undefined,
      query.limit ? Number(query.limit) : undefined
    )

    // Build where conditions
    const where: Prisma.WriteOffWhereInput = {}

    if (query.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { reason: { contains: query.search, mode: 'insensitive' } }
      ]
    }

    if (query.status) {
      where.status = query.status
    }

    if (query.fromDate || query.toDate) {
      where.writeOffDate = {}
      if (query.fromDate) {
        where.writeOffDate.gte = new Date(query.fromDate)
      }
      if (query.toDate) {
        const toDate = new Date(query.toDate)
        toDate.setHours(23, 59, 59, 999)
        where.writeOffDate.lte = toDate
      }
    }

    // Build orderBy
    let orderBy: Prisma.WriteOffOrderByWithRelationInput = { writeOffDate: 'desc' }
    if (query.sortBy) {
      const order = query.sortOrder === 'asc' ? 'asc' : 'desc'
      switch (query.sortBy) {
        case 'writeOffDate':
          orderBy = { writeOffDate: order }
          break
        case 'totalValue':
          orderBy = { totalValue: order }
          break
        case 'code':
          orderBy = { code: order }
          break
      }
    }

    const [records, total] = await Promise.all([
      prisma.writeOff.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          staff: {
            select: { id: true, code: true, fullName: true }
          },
          writeOffItems: {
            include: {
              item: { select: { id: true, name: true } },
              batch: { select: { id: true, batchCode: true } }
            }
          },
          _count: {
            select: { writeOffItems: true }
          }
        }
      }),
      prisma.writeOff.count({ where })
    ])

    return {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      total,
      writeOffs: records.map(record => ({
        id: record.id,
        code: record.code,
        writeOffDate: record.writeOffDate,
        reason: record.reason,
        status: record.status,
        totalValue: Number(record.totalValue),
        notes: record.notes,
        staff: record.staff,
        createdAt: record.createdAt,
        items: record.writeOffItems.map(item => ({
          itemId: item.itemId,
          itemName: item.item.name,
          batchId: item.batchId,
          batchCode: item.batch.batchCode,
          quantity: Number(item.quantity),
          unit: item.unit,
          unitCost: Number(item.unitCost),
          totalValue: Number(item.totalValue),
          reason: item.reason,
          notes: item.notes
        }))
      }))
    }
  }

  /**
   * Lấy chi tiết phiếu xuất huỷ
   */
  async getById(id: number) {
    const record = await prisma.writeOff.findFirst({
      where: { id },
      include: {
        staff: {
          select: { id: true, code: true, fullName: true }
        },
        writeOffItems: {
          include: {
            item: { 
              select: { 
                id: true, 
                name: true, 
                unit: { select: { name: true, symbol: true } } 
              } 
            },
            batch: { select: { id: true, batchCode: true, expiryDate: true } }
          }
        }
      }
    })

    if (!record) {
      throw new NotFoundRequestError('Không tìm thấy phiếu xuất huỷ')
    }

    return {
      id: record.id,
      code: record.code,
      writeOffDate: record.writeOffDate,
      reason: record.reason,
      status: record.status,
      totalValue: Number(record.totalValue),
      notes: record.notes,
      staff: record.staff,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      items: record.writeOffItems.map(item => ({
        itemId: item.itemId,
        itemName: item.item.name,
        unit: item.unit || item.item.unit?.symbol,
        batchId: item.batchId,
        batchCode: item.batch.batchCode,
        expiryDate: item.batch.expiryDate,
        quantity: Number(item.quantity),
        unitCost: Number(item.unitCost),
        totalValue: Number(item.totalValue),
        reason: item.reason,
        notes: item.notes
      }))
    }
  }

  /**
   * Cập nhật phiếu xuất huỷ (chỉ phiếu draft)
   */
  async update(id: number, dto: UpdateWriteOffDto) {
    const record = await prisma.writeOff.findFirst({
      where: { id },
      include: { writeOffItems: true }
    })

    if (!record) {
      throw new NotFoundRequestError('Không tìm thấy phiếu xuất huỷ')
    }

    if (record.status !== 'draft') {
      throw new BadRequestError({ message: 'Chỉ có thể sửa phiếu tạm' })
    }

    // If updating items, validate all items and batches
    if (dto.items && dto.items.length > 0) {
      for (const item of dto.items) {
        const batch = await prisma.inventoryBatch.findFirst({
          where: { id: item.batchId, itemId: item.itemId }
        })
        if (!batch) {
          throw new BadRequestError({ message: `Lô hàng ${item.batchId} không tồn tại` })
        }
        if (Number(batch.remainingQty) < item.quantity) {
          throw new BadRequestError({ message: `Lô hàng ${item.batchId} không đủ số lượng` })
        }
      }
    }

    await prisma.$transaction(async (tx) => {
      // If items provided, delete old and create new
      if (dto.items && dto.items.length > 0) {
        await tx.writeOffItem.deleteMany({
          where: { writeOffId: id }
        })

        const writeOffItems = dto.items.map(item => {
          const unitCost = item.unitCost || 0
          const totalValue = item.quantity * unitCost
          return { ...item, unitCost, totalValue }
        })
        const totalValue = writeOffItems.reduce((sum, item) => sum + item.totalValue, 0)

        for (const item of writeOffItems) {
          await tx.writeOffItem.create({
            data: {
              writeOffId: id,
              itemId: item.itemId,
              batchId: item.batchId,
              quantity: new Prisma.Decimal(item.quantity),
              unit: item.unit,
              unitCost: new Prisma.Decimal(item.unitCost),
              totalValue: new Prisma.Decimal(item.totalValue),
              reason: item.reason
            }
          })
        }

        await tx.writeOff.update({
          where: { id },
          data: {
            writeOffDate: dto.writeOffDate ? new Date(dto.writeOffDate) : undefined,
            reason: dto.reason,
            notes: dto.notes,
            totalValue: new Prisma.Decimal(totalValue)
          }
        })
      } else {
        await tx.writeOff.update({
          where: { id },
          data: {
            writeOffDate: dto.writeOffDate ? new Date(dto.writeOffDate) : undefined,
            reason: dto.reason,
            notes: dto.notes
          }
        })
      }
    })

    return this.getById(id)
  }

  /**
   * Hoàn thành phiếu xuất huỷ - trừ tồn kho
   */
  async complete(id: number) {
    const record = await prisma.writeOff.findFirst({
      where: { id },
      include: { writeOffItems: true }
    })

    if (!record) {
      throw new NotFoundRequestError('Không tìm thấy phiếu xuất huỷ')
    }

    if (record.status === 'completed') {
      throw new BadRequestError({ message: 'Phiếu đã hoàn thành' })
    }

    if (record.status === 'cancelled') {
      throw new BadRequestError({ message: 'Không thể hoàn thành phiếu đã huỷ' })
    }

    // Validate stock availability again
    for (const item of record.writeOffItems) {
      const batch = await prisma.inventoryBatch.findUnique({
        where: { id: item.batchId }
      })
      if (!batch || Number(batch.remainingQty) < Number(item.quantity)) {
        throw new BadRequestError({ message: `Lô hàng ${item.batchId} không đủ số lượng để xuất huỷ` })
      }
    }

    // Complete and update inventory
    await prisma.$transaction(async (tx) => {
      await tx.writeOff.update({
        where: { id },
        data: { status: 'completed' }
      })

      // Deduct from inventory batches and items
      for (const item of record.writeOffItems) {
        const qty = Number(item.quantity)
        const value = Number(item.totalValue)

        // Update batch remaining qty
        await tx.inventoryBatch.update({
          where: { id: item.batchId },
          data: {
            remainingQty: { decrement: new Prisma.Decimal(qty) }
          }
        })

        // Update inventory item
        const inventoryItem = await tx.inventoryItem.findUnique({
          where: { id: item.itemId }
        })

        if (inventoryItem) {
          const newStock = Math.max(0, Number(inventoryItem.currentStock) - qty)
          const newTotalValue = Math.max(0, Number(inventoryItem.totalValue) - value)
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
    })

    // Auto-update stockStatus cho các items đã xuất huỷ
    const itemIds = record.writeOffItems.map(item => item.itemId)
    await updateMultipleItemsStockStatus(itemIds)

    return this.getById(id)
  }

  /**
   * Huỷ phiếu xuất huỷ
   */
  async cancel(id: number) {
    const record = await prisma.writeOff.findFirst({
      where: { id }
    })

    if (!record) {
      throw new NotFoundRequestError('Không tìm thấy phiếu xuất huỷ')
    }

    if (record.status === 'completed') {
      throw new BadRequestError({ message: 'Không thể huỷ phiếu đã hoàn thành' })
    }

    await prisma.writeOff.update({
      where: { id },
      data: { status: 'cancelled' }
    })

    return { message: 'Huỷ phiếu xuất huỷ thành công' }
  }
}

export const writeOffService = new WriteOffService()
