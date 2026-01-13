import { prisma } from '~/config/database'
import { BadRequestError, NotFoundRequestError } from '~/core/error.response'
import { CreateSupplierDto, UpdateSupplierDto, SupplierQueryDto } from '~/dtos/supplier'
import { parsePagination, generateCode } from '~/utils/helpers'
import { Prisma } from '@prisma/client'

class SupplierService {
  /**
   * Create new supplier
   */
  async create(dto: CreateSupplierDto) {
    // Check if name already exists
    const existing = await prisma.supplier.findFirst({
      where: {
        name: dto.name,
        deletedAt: null
      }
    })

    if (existing) {
      throw new BadRequestError({ message: 'Nhà cung cấp với tên này đã tồn tại' })
    }

    // Create with temp code, then update with generated code
    const supplier = await prisma.$transaction(async (tx) => {
      const record = await tx.supplier.create({
        data: {
          code: 'TEMP',
          name: dto.name,
          contactPerson: dto.contactPerson,
          phone: dto.phone,
          email: dto.email,
          address: dto.address,
          city: dto.city,
          category: dto.category
        }
      })
      
      return tx.supplier.update({
        where: { id: record.id },
        data: { code: generateCode('NCC', record.id) }
      })
    })

    return supplier
  }

  /**
   * Get all unique supplier categories
   */
  async getAllCategories() {
    const categories = await prisma.supplier.findMany({
      select: { category: true },
      where: { 
        deletedAt: null,
        category: { not: null }
      },
      distinct: ['category'],
      orderBy: { category: 'asc' }
    })
    
    // Filter out nulls and empty strings just in case
    return {
      categories: categories
      .map(c => c.category)
      .filter((c): c is string => !!c)
    }
  }

  /**
   * Get all suppliers with filters and pagination
   */
  async getAll(query: SupplierQueryDto) {
    const { page, limit, skip } = parsePagination(
      query.page ? Number(query.page) : undefined,
      query.limit ? Number(query.limit) : undefined
    )

    // Build where conditions
    const where: Prisma.SupplierWhereInput = {
      deletedAt: null
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search } },
        { contactPerson: { contains: query.search, mode: 'insensitive' } }
      ]
    }

    if (query.status) {
      where.status = query.status
    }

    if (query.category) {
      where.category = query.category
    }

    if (query.city) {
      where.city = query.city
    }

    // Build orderBy
    let orderBy: Prisma.SupplierOrderByWithRelationInput = { createdAt: 'desc' }
    if (query.sortBy) {
      const order = query.sortOrder === 'asc' ? 'asc' : 'desc'
      switch (query.sortBy) {
        case 'name':
          orderBy = { name: order }
          break
        case 'totalDebt':
          orderBy = { totalDebt: order }
          break
        case 'createdAt':
          orderBy = { createdAt: order }
          break
      }
    }

    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          purchaseOrders: {
            orderBy: { orderDate: 'desc' },
            take: 10,
            select: {
              id: true,
              code: true,
              orderDate: true,
              totalAmount: true,
              paidAmount: true,
              debtAmount: true,
              status: true,
              paymentStatus: true
            }
          },
          _count: {
            select: { purchaseOrders: true }
          }
        }
      }),
      prisma.supplier.count({ where })
    ])

    return {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      total,
      suppliers: suppliers.map(s => ({
        id: s.id,
        code: s.code,
        name: s.name,
        contactPerson: s.contactPerson,
        phone: s.phone,
        email: s.email,
        address: s.address,
        city: s.city,
        category: s.category,
        status: s.status,
        totalDebt: Number(s.totalDebt),
        totalPurchaseAmount: Number(s.totalPurchases),
        purchaseOrderCount: s._count.purchaseOrders,
        createdAt: s.createdAt,
        recentOrders: s.purchaseOrders.map(po => ({
          id: po.id,
          code: po.code,
          orderDate: po.orderDate,
          totalAmount: Number(po.totalAmount),
          paidAmount: Number(po.paidAmount),
          debtAmount: Number(po.debtAmount),
          status: po.status,
          paymentStatus: po.paymentStatus
        }))
      }))
    }
  }

  /**
   * Get supplier by ID
   */
  async getById(id: number) {
    const supplier = await prisma.supplier.findFirst({
      where: { id, deletedAt: null },
      include: {
        purchaseOrders: {
          orderBy: { orderDate: 'desc' },
          take: 10,
          select: {
            id: true,
            code: true,
            orderDate: true,
            totalAmount: true,
            paidAmount: true,
            status: true
          }
        },
        _count: {
          select: { purchaseOrders: true }
        }
      }
    })

    if (!supplier) {
      throw new NotFoundRequestError('Không tìm thấy nhà cung cấp')
    }

    return {
      id: supplier.id,
      code: supplier.code,
      name: supplier.name,
      contactPerson: supplier.contactPerson,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address,
      city: supplier.city,
      category: supplier.category,
      status: supplier.status,
      totalDebt: Number(supplier.totalDebt),
      totalPurchaseAmount: Number(supplier.totalPurchases),
      purchaseOrderCount: supplier._count.purchaseOrders,
      createdAt: supplier.createdAt,
      updatedAt: supplier.updatedAt,
      recentOrders: supplier.purchaseOrders.map(po => ({
        id: po.id,
        code: po.code,
        orderDate: po.orderDate,
        totalAmount: Number(po.totalAmount),
        paidAmount: Number(po.paidAmount),
        status: po.status
      }))
    }
  }

  /**
   * Update supplier
   */
  async update(id: number, dto: UpdateSupplierDto) {
    const supplier = await prisma.supplier.findFirst({
      where: { id, deletedAt: null }
    })

    if (!supplier) {
      throw new NotFoundRequestError('Không tìm thấy nhà cung cấp')
    }

    // Check name uniqueness if updating
    if (dto.name && dto.name !== supplier.name) {
      const existing = await prisma.supplier.findFirst({
        where: {
          name: dto.name,
          deletedAt: null,
          id: { not: id }
        }
      })
      if (existing) {
        throw new BadRequestError({ message: 'Nhà cung cấp với tên này đã tồn tại' })
      }
    }

    const updated = await prisma.supplier.update({
      where: { id },
      data: { ...dto }
    })

    return {
      ...updated,
      totalDebt: Number(updated.totalDebt),
      totalPurchases: Number(updated.totalPurchases)
    }
  }

  /**
   * Delete supplier (soft delete)
   */
  async delete(id: number) {
    const supplier = await prisma.supplier.findFirst({
      where: { id, deletedAt: null },
      include: {
        _count: {
          select: { purchaseOrders: true }
        }
      }
    })

    if (!supplier) {
      throw new NotFoundRequestError('Không tìm thấy nhà cung cấp')
    }

    // Check if supplier has purchase orders
    if (supplier._count.purchaseOrders > 0) {
      throw new BadRequestError({ 
        message: 'Không thể xóa nhà cung cấp đã có phiếu nhập hàng. Hãy vô hiệu hóa thay vì xóa.' 
      })
    }

    await prisma.supplier.update({
      where: { id },
      data: { deletedAt: new Date() }
    })

    return { message: 'Xóa nhà cung cấp thành công' }
  }

  /**
   * Toggle supplier status (active/inactive)
   */
  async toggleStatus(id: number) {
    const supplier = await prisma.supplier.findFirst({
      where: { id, deletedAt: null }
    })

    if (!supplier) {
      throw new NotFoundRequestError('Không tìm thấy nhà cung cấp')
    }

    const newStatus = supplier.status === 'active' ? 'inactive' : 'active'

    const updated = await prisma.supplier.update({
      where: { id },
      data: { status: newStatus }
    })

    return {
      ...updated,
      totalDebt: Number(updated.totalDebt),
      totalPurchases: Number(updated.totalPurchases)
    }
  }
}

export const supplierService = new SupplierService()
