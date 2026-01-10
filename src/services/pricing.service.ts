import { prisma } from '~/config/database'
import { BadRequestError, NotFoundRequestError } from '~/core/error.response'
import { 
  PricingQueryDto, 
  UpdateSinglePriceDto, 
  UpdateCategoryPriceDto, 
  BatchUpdatePriceDto
} from '~/dtos/pricing'
import { PriceBaseType, AdjustmentType } from '~/enums'
import { parsePagination } from '~/utils/helpers'
import { Prisma } from '@prisma/client'

class PricingService {
  /**
   * Lấy danh sách sản phẩm với thông tin giá
   * Bao gồm: costPrice (avgUnitCost), lastPurchasePrice (từ batch gần nhất), sellingPrice
   */
  async getAll(query: PricingQueryDto) {
    const { page, limit, skip } = parsePagination(
      query.page ? Number(query.page) : undefined,
      query.limit ? Number(query.limit) : undefined
    )

    // Build where conditions
    const where: Prisma.InventoryItemWhereInput = {
      deletedAt: null
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        // SKU/code if exists - assuming name contains it for now
      ]
    }

    if (query.categoryId) {
      where.categoryId = Number(query.categoryId)
    }

    if (query.itemTypeId) {
      where.itemTypeId = Number(query.itemTypeId)
    }

    // Build orderBy
    let orderBy: Prisma.InventoryItemOrderByWithRelationInput = { name: 'asc' }
    if (query.sortBy) {
      const order = query.sortOrder === 'desc' ? 'desc' : 'asc'
      switch (query.sortBy) {
        case 'name':
          orderBy = { name: order }
          break
        case 'sellingPrice':
          orderBy = { sellingPrice: order }
          break
        case 'costPrice':
          orderBy = { avgUnitCost: order }
          break
        case 'createdAt':
          orderBy = { createdAt: order }
          break
      }
    }

    const [items, total] = await Promise.all([
      prisma.inventoryItem.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          category: { select: { id: true, name: true } },
          unit: { select: { id: true, name: true, symbol: true } },
          itemType: { select: { id: true, name: true } },
          // Lấy batch gần nhất để có lastPurchasePrice
          inventoryBatches: {
            orderBy: { entryDate: 'desc' },
            take: 1,
            select: {
              unitCost: true,
              entryDate: true
            }
          }
        }
      }),
      prisma.inventoryItem.count({ where })
    ])

    // Map response với costPrice, lastPurchasePrice, margin
    const pricingItems = items.map(item => {
      const costPrice = Number(item.avgUnitCost || 0)
      const sellingPrice = Number(item.sellingPrice || 0)
      const lastBatch = item.inventoryBatches[0]
      const lastPurchasePrice = lastBatch ? Number(lastBatch.unitCost || 0) : costPrice
      const margin = sellingPrice > 0 
        ? ((sellingPrice - costPrice) / sellingPrice * 100) 
        : 0

      return {
        id: item.id,
        name: item.name,
        category: item.category,
        itemType: item.itemType,
        unit: item.unit,
        costPrice,           // Giá vốn bình quân
        lastPurchasePrice,   // Giá nhập cuối cùng
        sellingPrice,        // Giá bán
        margin: Math.round(margin * 10) / 10,  // Lợi nhuận %
        lastPurchaseDate: lastBatch?.entryDate || null
      }
    })

    return {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      total,
      items: pricingItems
    }
  }

  /**
   * Cập nhật giá cho 1 sản phẩm theo công thức
   * newPrice = basePrice + adjustment (VNĐ hoặc %)
   */
  async updateSinglePrice(dto: UpdateSinglePriceDto) {
    const item = await prisma.inventoryItem.findFirst({
      where: { id: dto.itemId, deletedAt: null },
      include: {
        inventoryBatches: {
          orderBy: { entryDate: 'desc' },
          take: 1,
          select: { unitCost: true }
        }
      }
    })

    if (!item) {
      throw new NotFoundRequestError('Không tìm thấy sản phẩm')
    }

    // Determine base price
    let basePrice: number
    switch (dto.baseType) {
      case PriceBaseType.COST:
        basePrice = Number(item.avgUnitCost || 0)
        break
      case PriceBaseType.LAST_PURCHASE:
        basePrice = item.inventoryBatches[0] 
          ? Number(item.inventoryBatches[0].unitCost || 0)
          : Number(item.avgUnitCost || 0)
        break
      case PriceBaseType.CURRENT:
      default:
        basePrice = Number(item.sellingPrice || 0)
    }

    // Calculate new price
    let newPrice: number
    if (dto.adjustmentType === AdjustmentType.PERCENT) {
      newPrice = basePrice + (basePrice * dto.adjustmentValue / 100)
    } else {
      newPrice = basePrice + dto.adjustmentValue
    }

    // Ensure non-negative
    newPrice = Math.max(0, newPrice)

    const updated = await prisma.inventoryItem.update({
      where: { id: dto.itemId },
      data: { sellingPrice: new Prisma.Decimal(newPrice) }
    })

    return {
      id: updated.id,
      name: updated.name,
      oldPrice: Number(item.sellingPrice || 0),
      newPrice,
      message: 'Cập nhật giá thành công'
    }
  }

  /**
   * Cập nhật giá cho tất cả sản phẩm trong 1 danh mục
   */
  async updateCategoryPrices(dto: UpdateCategoryPriceDto) {
    // Get all items in category
    const items = await prisma.inventoryItem.findMany({
      where: { 
        categoryId: dto.categoryId,
        deletedAt: null 
      },
      include: {
        inventoryBatches: {
          orderBy: { entryDate: 'desc' },
          take: 1,
          select: { unitCost: true }
        }
      }
    })

    if (items.length === 0) {
      throw new BadRequestError({ message: 'Không có sản phẩm nào trong danh mục này' })
    }

    // Calculate new prices for each item
    const updates = items.map(item => {
      let basePrice: number
      switch (dto.baseType) {
        case PriceBaseType.COST:
          basePrice = Number(item.avgUnitCost || 0)
          break
        case PriceBaseType.LAST_PURCHASE:
          basePrice = item.inventoryBatches[0] 
            ? Number(item.inventoryBatches[0].unitCost || 0)
            : Number(item.avgUnitCost || 0)
          break
        case PriceBaseType.CURRENT:
        default:
          basePrice = Number(item.sellingPrice || 0)
      }

      let newPrice: number
      if (dto.adjustmentType === AdjustmentType.PERCENT) {
        newPrice = basePrice + (basePrice * dto.adjustmentValue / 100)
      } else {
        newPrice = basePrice + dto.adjustmentValue
      }

      return {
        id: item.id,
        newPrice: Math.max(0, newPrice)
      }
    })

    // Batch update
    await prisma.$transaction(
      updates.map(u => 
        prisma.inventoryItem.update({
          where: { id: u.id },
          data: { sellingPrice: new Prisma.Decimal(u.newPrice) }
        })
      )
    )

    return {
      updatedCount: items.length,
      categoryId: dto.categoryId,
      message: `Đã cập nhật giá cho ${items.length} sản phẩm`
    }
  }

  /**
   * Cập nhật giá trực tiếp cho nhiều sản phẩm
   */
  async batchUpdatePrices(dto: BatchUpdatePriceDto) {
    const results = await prisma.$transaction(
      dto.items.map(item =>
        prisma.inventoryItem.update({
          where: { id: item.id },
          data: { sellingPrice: new Prisma.Decimal(item.sellingPrice) }
        })
      )
    )

    return { 
      updatedCount: results.length,
      message: `Đã cập nhật giá cho ${results.length} sản phẩm`
    }
  }
}

export const pricingService = new PricingService()
