import { prisma } from '~/config/database'
import { BadRequestError, NotFoundRequestError } from '~/core/error.response'
import { CreateCategoryDto, UpdateCategoryDto } from '~/dtos/category'

class CategoryService {
  /**
   * Create new category
   */
  async createCategory(dto: CreateCategoryDto) {
    // Check if name already exists
    const existing = await prisma.category.findFirst({
      where: { 
        name: dto.name,
        deletedAt: null
      }
    })

    if (existing) {
      throw new BadRequestError({ message: 'Danh mục với tên này đã tồn tại' })
    }

    const category = await prisma.category.create({
      data: {
        name: dto.name
      }
    })

    return category
  }

  /**
   * Get all categories
   */
  async getAllCategories() {
    const categories = await prisma.category.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { inventoryItems: true }
        }
      }
    })

    return categories
  }

  /**
   * Get category by ID
   */
  async getCategoryById(id: number) {
    const category = await prisma.category.findFirst({
      where: { id, deletedAt: null },
      include: {
        _count: {
          select: { inventoryItems: true }
        }
      }
    })

    if (!category) {
      throw new NotFoundRequestError('Không tìm thấy danh mục')
    }

    return category
  }

  /**
   * Update category
   */
  async updateCategory(id: number, dto: UpdateCategoryDto) {
    const category = await prisma.category.findFirst({
      where: { id, deletedAt: null }
    })

    if (!category) {
      throw new NotFoundRequestError('Không tìm thấy danh mục')
    }

    // Check name uniqueness if updating name
    if (dto.name && dto.name !== category.name) {
      const existing = await prisma.category.findFirst({
        where: { 
          name: dto.name,
          deletedAt: null,
          id: { not: id }
        }
      })
      if (existing) {
        throw new BadRequestError({ message: 'Danh mục với tên này đã tồn tại' })
      }
    }

    const updatedCategory = await prisma.category.update({
      where: { id },
      data: { ...dto }
    })

    return updatedCategory
  }

  /**
   * Delete category (soft delete)
   */
  async deleteCategory(id: number) {
    const category = await prisma.category.findFirst({
      where: { id, deletedAt: null },
      include: {
        _count: {
          select: { inventoryItems: true }
        }
      }
    })

    if (!category) {
      throw new NotFoundRequestError('Không tìm thấy danh mục')
    }

    // Check if category is in use
    if (category._count.inventoryItems > 0) {
      throw new BadRequestError({ message: 'Không thể xóa danh mục đang có sản phẩm' })
    }

    await prisma.category.update({
      where: { id },
      data: { deletedAt: new Date() }
    })

    return { message: 'Xóa danh mục thành công' }
  }
}

export const categoryService = new CategoryService()
