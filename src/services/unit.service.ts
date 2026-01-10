import { prisma } from '~/config/database'
import { BadRequestError, NotFoundRequestError } from '~/core/error.response'
import { CreateUnitDto, UpdateUnitDto } from '~/dtos/unit'

class UnitService {
  /**
   * Create new unit
   */
  async createUnit(dto: CreateUnitDto) {
    // Check if name or symbol already exists
    const existing = await prisma.unit.findFirst({
      where: {
        OR: [
          { name: dto.name },
          { symbol: dto.symbol }
        ],
        deletedAt: null
      }
    })

    if (existing) {
      throw new BadRequestError({ message: 'Đơn vị với tên hoặc ký hiệu này đã tồn tại' })
    }

    const unit = await prisma.unit.create({
      data: {
        name: dto.name,
        symbol: dto.symbol
      }
    })

    return unit
  }

  /**
   * Get all units
   */
  async getAllUnits() {
    const units = await prisma.unit.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { inventoryItems: true }
        }
      }
    })

    return units
  }

  /**
   * Get unit by ID
   */
  async getUnitById(id: number) {
    const unit = await prisma.unit.findFirst({
      where: { id, deletedAt: null },
      include: {
        _count: {
          select: { inventoryItems: true }
        }
      }
    })

    if (!unit) {
      throw new NotFoundRequestError('Không tìm thấy đơn vị')
    }

    return unit
  }

  /**
   * Update unit
   */
  async updateUnit(id: number, dto: UpdateUnitDto) {
    const unit = await prisma.unit.findFirst({
      where: { id, deletedAt: null }
    })

    if (!unit) {
      throw new NotFoundRequestError('Không tìm thấy đơn vị')
    }

    // Check uniqueness if updating name or symbol
    if (dto.name || dto.symbol) {
      const orConditions: any[] = []
      if (dto.name && dto.name !== unit.name) {
        orConditions.push({ name: dto.name })
      }
      if (dto.symbol && dto.symbol !== unit.symbol) {
        orConditions.push({ symbol: dto.symbol })
      }

      if (orConditions.length > 0) {
        const existing = await prisma.unit.findFirst({
          where: {
            OR: orConditions,
            deletedAt: null,
            id: { not: id }
          }
        })
        if (existing) {
          throw new BadRequestError({ message: 'Đơn vị với tên hoặc ký hiệu này đã tồn tại' })
        }
      }
    }

    const updatedUnit = await prisma.unit.update({
      where: { id },
      data: { ...dto }
    })

    return updatedUnit
  }

  /**
   * Delete unit (soft delete)
   */
  async deleteUnit(id: number) {
    const unit = await prisma.unit.findFirst({
      where: { id, deletedAt: null },
      include: {
        _count: {
          select: { inventoryItems: true }
        }
      }
    })

    if (!unit) {
      throw new NotFoundRequestError('Không tìm thấy đơn vị')
    }

    // Check if unit is in use
    if (unit._count.inventoryItems > 0) {
      throw new BadRequestError({ message: 'Không thể xóa đơn vị đang được sử dụng' })
    }

    await prisma.unit.update({
      where: { id },
      data: { deletedAt: new Date() }
    })

    return { message: 'Xóa đơn vị thành công' }
  }
}

export const unitService = new UnitService()
