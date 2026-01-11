import { prisma } from '~/config/database'
import { BadRequestError, NotFoundRequestError } from '~/core/error.response'
import { generateCode, parsePagination } from '~/utils/helpers'
import { CreateItemDto, UpdateItemDto, ItemQueryDto } from '~/dtos/inventoryItem'
import { Prisma } from '@prisma/client'

class InventoryItemService {
  /**
   * Create new inventory item
   */
  async createItem(dto: CreateItemDto) {
    // Check duplicate name
    const existingItem = await prisma.inventoryItem.findFirst({
      where: { 
        name: { equals: dto.name, mode: 'insensitive' },
        deletedAt: null 
      }
    })
    if (existingItem) {
      throw new BadRequestError({ message: `Sản phẩm "${dto.name}" đã tồn tại` })
    }

    // Validate itemType exists
    const itemType = await prisma.itemType.findUnique({
      where: { id: dto.itemTypeId }
    })
    if (!itemType) {
      throw new BadRequestError({ message: 'Loại hàng không hợp lệ' })
    }

    // Validate category if provided
    if (dto.categoryId) {
      const category = await prisma.category.findFirst({
        where: { id: dto.categoryId, deletedAt: null }
      })
      if (!category) {
        throw new BadRequestError({ message: 'Không tìm thấy danh mục' })
      }
    }

    // Validate unit if provided
    if (dto.unitId) {
      const unit = await prisma.unit.findFirst({
        where: { id: dto.unitId, deletedAt: null }
      })
      if (!unit) {
        throw new BadRequestError({ message: 'Không tìm thấy đơn vị' })
      }
    }

    // Use transaction for composite items with ingredients
    const item = await prisma.$transaction(async (tx) => {
      // Determine code prefix based on item type
      const getPrefixByTypeName = (typeName: string): string => {
        switch (typeName) {
          case 'ready_made': return 'RM'
          case 'composite': return 'CP'
          case 'ingredient': return 'IG'
          default: return 'SP'
        }
      }
      const prefix = getPrefixByTypeName(itemType.name)

      // Create the main item with temp code
      const newItem = await tx.inventoryItem.create({
        data: {
          code: 'TEMP',
          name: dto.name,
          itemTypeId: dto.itemTypeId,
          categoryId: dto.categoryId,
          unitId: dto.unitId,
          minStock: dto.minStock ? new Prisma.Decimal(dto.minStock) : null,
          maxStock: dto.maxStock ? new Prisma.Decimal(dto.maxStock) : null,
          sellingPrice: dto.sellingPrice ? new Prisma.Decimal(dto.sellingPrice) : null,
          productStatus: dto.saleStatus,  // Map saleStatus -> productStatus (DB field)
          isTopping: dto.isTopping ?? false,
          imageUrl: dto.imageUrl
        }
      })

      // Update with generated code based on ID
      await tx.inventoryItem.update({
        where: { id: newItem.id },
        data: { code: generateCode(prefix, newItem.id) }
      })

      // Add ingredients if composite item
      if (dto.ingredients && dto.ingredients.length > 0) {
        await tx.itemIngredient.createMany({
          data: dto.ingredients.map(ing => ({
            compositeItemId: newItem.id,
            ingredientItemId: ing.ingredientItemId,
            quantity: new Prisma.Decimal(ing.quantity),
            unit: ing.unit
          }))
        })
      }

      // Add toppings if provided
      if (dto.toppingIds && dto.toppingIds.length > 0) {
        await tx.itemTopping.createMany({
          data: dto.toppingIds.map(toppingId => ({
            productId: newItem.id,
            toppingId: toppingId
          }))
        })
      }

      return newItem
    })

    // Return with relations
    return this.getItemById(item.id)
  }

  /**
   * Get all items with filters and pagination
   */
  async getAllItems(query: ItemQueryDto) {
    const { page, limit, skip } = parsePagination(query.page, query.limit)

    // Build where conditions
    const where: Prisma.InventoryItemWhereInput = {
      deletedAt: null
    }

    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' }
      where.code = { contains: query.search, mode: 'insensitive' }
    }

    // Convert to number since query params come as strings
    if (query.categoryId) {
      where.categoryId = Number(query.categoryId)
    }

    if (query.itemTypeId) {
      where.itemTypeId = Number(query.itemTypeId)
    }

    // Filter theo trạng thái kho (multi-select)
    if (query.stockStatus && query.stockStatus.length > 0) {
      where.status = { in: query.stockStatus }
    }

    // Filter theo trạng thái bán (multi-select), map saleStatus -> productStatus
    if (query.saleStatus && query.saleStatus.length > 0) {
      where.productStatus = { in: query.saleStatus }
    }

    // Build orderBy
    let orderBy: Prisma.InventoryItemOrderByWithRelationInput = { createdAt: 'desc' }
    if (query.sortBy) {
      const order = query.sortOrder === 'asc' ? 'asc' : 'desc'
      switch (query.sortBy) {
        case 'name':
          orderBy = { name: order }
          break
        case 'currentStock':
          orderBy = { currentStock: order }
          break
        case 'sellingPrice':
          orderBy = { sellingPrice: order }
          break
        case 'createdAt':
          orderBy = { createdAt: order }
          break
        default:
          orderBy = { createdAt: 'desc' }
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
          _count: {
            select: {
              inventoryBatches: true,
              ingredientOf: true
            }
          }
        }
      }),
      prisma.inventoryItem.count({ where })
    ])

    return {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      total,
      items
    }
  }

  /**
   * Get item by ID with full details
   */
  async getItemById(id: number) {
    const item = await prisma.inventoryItem.findFirst({
      where: { id, deletedAt: null },
      include: {
        category: { select: { id: true, name: true } },
        unit: { select: { id: true, name: true, symbol: true } },
        itemType: { select: { id: true, name: true } },
        // Ingredients for composite items (ingredientOf = what this item is made of)
        ingredientOf: {
          include: {
            ingredientItem: {
              select: { id: true, name: true, avgUnitCost: true, unit: true }
            }
          }
        },
        // Toppings (toppingFor = what toppings this product can have)
        toppingFor: {
          include: {
            topping: {
              select: { id: true, name: true, sellingPrice: true }
            }
          }
        },
        // Batches for ready-made and ingredients
        inventoryBatches: {
          orderBy: { entryDate: 'desc' },
          include: {
            supplier: { select: { id: true, name: true } }
          }
        }
      }
    })

    if (!item) {
      throw new NotFoundRequestError('Không tìm thấy sản phẩm')
    }

    return item
  }

  /**
   * Update item
   */
  async updateItem(id: number, dto: UpdateItemDto) {
    // Check item exists
    const item = await prisma.inventoryItem.findFirst({
      where: { id, deletedAt: null }
    })

    if (!item) {
      throw new NotFoundRequestError('Không tìm thấy sản phẩm')
    }

    // Check duplicate name if updating name
    if (dto.name && dto.name !== item.name) {
      const existingItem = await prisma.inventoryItem.findFirst({
        where: { 
          name: { equals: dto.name, mode: 'insensitive' },
          deletedAt: null,
          id: { not: id }
        }
      })
      if (existingItem) {
        throw new BadRequestError({ message: `Sản phẩm "${dto.name}" đã tồn tại` })
      }
    }

    // Validate category if provided
    if (dto.categoryId) {
      const category = await prisma.category.findFirst({
        where: { id: dto.categoryId, deletedAt: null }
      })
      if (!category) {
        throw new BadRequestError({ message: 'Không tìm thấy danh mục' })
      }
    }

    // Validate unit if provided
    if (dto.unitId) {
      const unit = await prisma.unit.findFirst({
        where: { id: dto.unitId, deletedAt: null }
      })
      if (!unit) {
        throw new BadRequestError({ message: 'Không tìm thấy đơn vị' })
      }
    }

    // Use transaction for updates with ingredients/toppings
    await prisma.$transaction(async (tx) => {
      // Update main item
      const updateData: Prisma.InventoryItemUpdateInput = {}

      if (dto.name !== undefined) updateData.name = dto.name
      if (dto.itemTypeId !== undefined) updateData.itemType = { connect: { id: dto.itemTypeId } }
      if (dto.categoryId !== undefined) updateData.category = { connect: { id: dto.categoryId } }
      if (dto.unitId !== undefined) updateData.unit = { connect: { id: dto.unitId } }
      if (dto.minStock !== undefined) updateData.minStock = new Prisma.Decimal(dto.minStock)
      if (dto.maxStock !== undefined) updateData.maxStock = new Prisma.Decimal(dto.maxStock)
      if (dto.sellingPrice !== undefined) updateData.sellingPrice = new Prisma.Decimal(dto.sellingPrice)
      if (dto.saleStatus !== undefined) updateData.productStatus = dto.saleStatus  // Map saleStatus -> productStatus
      if (dto.isTopping !== undefined) updateData.isTopping = dto.isTopping
      if (dto.imageUrl !== undefined) updateData.imageUrl = dto.imageUrl

      await tx.inventoryItem.update({
        where: { id },
        data: updateData
      })

      // Update ingredients if provided (replace all)
      if (dto.ingredients !== undefined) {
        await tx.itemIngredient.deleteMany({
          where: { compositeItemId: id }
        })

        if (dto.ingredients.length > 0) {
          await tx.itemIngredient.createMany({
            data: dto.ingredients.map(ing => ({
              compositeItemId: id,
              ingredientItemId: ing.ingredientItemId,
              quantity: new Prisma.Decimal(ing.quantity),
              unit: ing.unit
            }))
          })
        }
      }

      // Update toppings if provided (replace all)
      if (dto.toppingIds !== undefined) {
        await tx.itemTopping.deleteMany({
          where: { productId: id }
        })

        if (dto.toppingIds.length > 0) {
          await tx.itemTopping.createMany({
            data: dto.toppingIds.map(toppingId => ({
              productId: id,
              toppingId: toppingId
            }))
          })
        }
      }
    })

    return this.getItemById(id)
  }

  /**
   * Delete item (soft delete)
   */
  async deleteItem(id: number) {
    const item = await prisma.inventoryItem.findFirst({
      where: { id, deletedAt: null }
    })

    if (!item) {
      throw new NotFoundRequestError('Không tìm thấy sản phẩm')
    }

    await prisma.inventoryItem.update({
      where: { id },
      data: { deletedAt: new Date() }
    })

    return { message: 'Xóa sản phẩm thành công' }
  }

  /**
   * Batch update prices
   */
  async updatePrices(items: { id: number; price: number }[]) {
    const results = await prisma.$transaction(
      items.map(item =>
        prisma.inventoryItem.update({
          where: { id: item.id },
          data: { sellingPrice: new Prisma.Decimal(item.price) }
        })
      )
    )

    return { updatedCount: results.length }
  }
}

export const inventoryItemService = new InventoryItemService()
