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
    const itemIds = dto.groups.flatMap(g => g.items.map(i => i.itemId))
    const items = await prisma.inventoryItem.findMany({
      where: { id: { in: itemIds }, deletedAt: null }
    })
    
    // Check if distinct items found match distinct requested items
    const distinctRequestedIds = new Set(itemIds)
    if (items.length !== distinctRequestedIds.size) {
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
        comboGroups: {
          create: dto.groups.map(group => ({
            name: group.name,
            minChoices: group.minChoices,
            maxChoices: group.maxChoices,
            isRequired: group.isRequired ?? true,
            comboItems: {
              create: group.items.map(item => ({
                itemId: item.itemId,
                extraPrice: item.extraPrice ?? 0
              }))
            }
          }))
        }
      },
      include: {
        comboGroups: {
          include: {
            comboItems: { include: { item: true } }
          }
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
        comboGroups: {
          include: {
            comboItems: {
              include: {
                item: {
                  select: { id: true, code: true, name: true, sellingPrice: true, imageUrl: true }
                }
              }
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
    const orderBy = query.sort
      ? (Object.entries(query.sort).map(([key, value]) => ({ [key]: value.toLowerCase() })) as any)
      : { createdAt: 'desc' }

    const [combos, total] = await Promise.all([
      prisma.combo.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          comboGroups: {
            include: {
              comboItems: {
                include: {
                  item: {
                    select: { id: true, code: true, name: true, sellingPrice: true, imageUrl: true }
                  }
                }
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

    // If groups are provided, update them
    if (dto.groups) {
      // Validate items exist
      const itemIds = dto.groups.flatMap(g => g.items.map(i => i.itemId))
      const items = await prisma.inventoryItem.findMany({
        where: { id: { in: itemIds }, deletedAt: null }
      })
      
      const distinctRequestedIds = new Set(itemIds)
      if (items.length !== distinctRequestedIds.size) {
        throw new BadRequestError({ message: 'Một số sản phẩm không tồn tại' })
      }

      // Delete old groups (will cascade delete items) and create new ones
      // Since cascade delete might not be configured in Prisma unless specified, 
      // safer to delete items first if needed, but groups deletion should trigger 
      // cascade if relation set correctly. Or manually delete.
      // Current schema didn't specify onDelete: Cascade explicitly in definition I saw, 
      // but usually Prisma handles one-to-many update nicely if we use delete + create.
      
      // Let's rely on transaction to delete old groups
      await prisma.$transaction(async (tx) => {
        // Need to find group IDs first to delete items? 
        // Actually, deleting ComboGroup should delete ComboItems if standard FK constraint exists.
        // Assuming standard behavior.
        // But to be safe, let's look at schema.
        // If not cascade, we must delete items first.
        
        // Find existing groups
        const existingGroups = await tx.comboGroup.findMany({ where: { comboId: id } })
        const existingGroupIds = existingGroups.map(g => g.id)
        
        // Delete items
        await tx.comboItem.deleteMany({ where: { comboGroupId: { in: existingGroupIds } } })
        
        // Delete groups
        await tx.comboGroup.deleteMany({ where: { comboId: id } })
        
        // Create new
        for (const group of dto.groups!) {
             const createdGroup = await tx.comboGroup.create({
                data: {
                    comboId: id,
                    name: group.name,
                    minChoices: group.minChoices,
                    maxChoices: group.maxChoices,
                    isRequired: group.isRequired ?? true
                }
             })

             if (group.items.length > 0) {
                 await tx.comboItem.createMany({
                    data: group.items.map(item => ({
                        comboGroupId: createdGroup.id,
                        itemId: item.itemId,
                        extraPrice: item.extraPrice ?? 0
                    }))
                 })
             }
        }
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
        comboGroups: {
          include: {
            comboItems: { include: { item: true } }
          }
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
        comboGroups: {
          include: {
            comboItems: {
              include: {
                item: {
                  select: { id: true, code: true, name: true, sellingPrice: true, imageUrl: true }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return combos
  }
}

export const comboService = new ComboService()
