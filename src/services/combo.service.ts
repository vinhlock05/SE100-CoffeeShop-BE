import { prisma } from '~/config/database'
import { BadRequestError, NotFoundRequestError } from '~/core/error.response'
import { CreateComboDto, UpdateComboDto, ComboQueryDto } from '~/dtos/combo'
import { parsePagination } from '~/utils/helpers'
import { Prisma } from '@prisma/client'

class ComboService {
  /**
   * Create new combo
   */
  async create(dto: CreateComboDto) {
    // Validate all items exist
    const itemIds = dto.items.map(item => item.itemId)
    const items = await prisma.inventoryItem.findMany({
      where: { id: { in: itemIds }, deletedAt: null }
    })
    if (items.length !== itemIds.length) {
      throw new BadRequestError({ message: 'Một số sản phẩm không tồn tại' })
    }

    // Calculate savings if originalPrice provided
    const savings = dto.originalPrice ? dto.originalPrice - dto.comboPrice : null

    const combo = await prisma.combo.create({
      data: {
        name: dto.name,
        description: dto.description,
        imageUrl: dto.imageUrl,
        comboPrice: dto.comboPrice,
        originalPrice: dto.originalPrice,
        savings,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        comboItems: {
          create: dto.items.map(item => ({
            itemId: item.itemId,
            quantity: item.quantity,
            groupName: item.groupName,
            isRequired: item.isRequired ?? true
          }))
        }
      },
      include: {
        comboItems: {
          include: { item: true }
        }
      }
    })

    return combo
  }

  /**
   * Get combo by ID
   */
  async getById(id: number) {
    const combo = await prisma.combo.findFirst({
      where: { id, deletedAt: null },
      include: {
        comboItems: {
          include: {
            item: {
              select: { id: true, code: true, name: true, sellingPrice: true, imageUrl: true }
            }
          }
        }
      }
    })

    if (!combo) {
      throw new NotFoundRequestError('Combo không tồn tại')
    }

    return combo
  }

  /**
   * Get all combos with filters
   */
  async getAll(query: ComboQueryDto) {
    const { page, limit, skip } = parsePagination(
      query.page ? Number(query.page) : undefined,
      query.limit ? Number(query.limit) : undefined
    )

    const where: Prisma.ComboWhereInput = { deletedAt: null }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } }
      ]
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive === 'true'
    }

    // Build orderBy
    let orderBy: Prisma.ComboOrderByWithRelationInput = { createdAt: 'desc' }
    if (query.sortBy) {
      const order = query.order || 'asc'
      switch (query.sortBy) {
        case 'name':
          orderBy = { name: order }
          break
        case 'comboPrice':
          orderBy = { comboPrice: order }
          break
        case 'createdAt':
          orderBy = { createdAt: order }
          break
      }
    }

    const [combos, total] = await Promise.all([
      prisma.combo.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          comboItems: {
            include: {
              item: {
                select: { id: true, code: true, name: true, sellingPrice: true, imageUrl: true }
              }
            }
          }
        }
      }),
      prisma.combo.count({ where })
    ])

    return {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      total,
      combos
    }
  }

  /**
   * Update combo
   */
  async update(id: number, dto: UpdateComboDto) {
    const combo = await this.getById(id)

    // Calculate savings if prices change
    const comboPrice = dto.comboPrice ?? Number(combo.comboPrice)
    const originalPrice = dto.originalPrice ?? Number(combo.originalPrice)
    const savings = originalPrice ? originalPrice - comboPrice : null

    // If items are provided, update them
    if (dto.items) {
      // Validate items exist
      const itemIds = dto.items.map(item => item.itemId)
      const items = await prisma.inventoryItem.findMany({
        where: { id: { in: itemIds }, deletedAt: null }
      })
      if (items.length !== itemIds.length) {
        throw new BadRequestError({ message: 'Một số sản phẩm không tồn tại' })
      }

      // Delete old items and create new ones
      await prisma.comboItem.deleteMany({ where: { comboId: id } })
      await prisma.comboItem.createMany({
        data: dto.items.map(item => ({
          comboId: id,
          itemId: item.itemId,
          quantity: item.quantity,
          groupName: item.groupName,
          isRequired: item.isRequired ?? true
        }))
      })
    }

    const updated = await prisma.combo.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        imageUrl: dto.imageUrl,
        comboPrice: dto.comboPrice,
        originalPrice: dto.originalPrice,
        savings,
        isActive: dto.isActive,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined
      },
      include: {
        comboItems: {
          include: { item: true }
        }
      }
    })

    return updated
  }

  /**
   * Delete combo (soft delete)
   */
  async delete(id: number) {
    await this.getById(id)

    await prisma.combo.update({
      where: { id },
      data: { deletedAt: new Date() }
    })

    return { message: 'Đã xóa combo' }
  }

  /**
   * Toggle combo active status
   */
  async toggleActive(id: number) {
    const combo = await this.getById(id)

    const updated = await prisma.combo.update({
      where: { id },
      data: { isActive: !combo.isActive }
    })

    return updated
  }

  /**
   * Get active combos (for POS)
   */
  async getActiveCombos() {
    const now = new Date()

    const combos = await prisma.combo.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        OR: [
          { startDate: null, endDate: null },
          { startDate: { lte: now }, endDate: null },
          { startDate: null, endDate: { gte: now } },
          { startDate: { lte: now }, endDate: { gte: now } }
        ]
      },
      include: {
        comboItems: {
          include: {
            item: {
              select: { id: true, code: true, name: true, sellingPrice: true, imageUrl: true }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    })

    return combos
  }
}

export const comboService = new ComboService()
