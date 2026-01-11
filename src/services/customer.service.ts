import { prisma } from '~/config/database'
import { BadRequestError, NotFoundRequestError } from '~/core/error.response'
import { CreateCustomerDto, UpdateCustomerDto, CustomerQueryDto } from '~/dtos/customer'
import { parsePagination, generateCode } from '~/utils/helpers'
import { Prisma } from '@prisma/client'
import { subMonths } from 'date-fns'
import customerGroupService from './customerGroup.service'
import { Gender } from '~/enums'
import { CustomerStatus } from '~/enums'

class CustomerService {
    /**
     * Create new customer
     */
    async create(dto: CreateCustomerDto) {
        // Check if phone already exists
        const existing = await prisma.customer.findFirst({
            where: {
                phone: dto.phone,
                deletedAt: null
            }
        })

        if (existing) {
            throw new BadRequestError({ message: 'Số điện thoại đã được sử dụng' })
        }

        // GroupId is required - auto-assign to default group if not provided
        // This ensures every customer always belongs to a group
        let groupId = dto.groupId
        if (!groupId) {
            const defaultGroup = await customerGroupService.getDefaultGroup()
            groupId = defaultGroup.id
        }

        // Create with temp code, then update with generated code
        const customer = await prisma.$transaction(async (tx) => {
            const record = await tx.customer.create({
                data: {
                    code: 'TEMP',
                    name: dto.name,
                    gender: dto.gender || Gender.MALE, // Default to MALE if not provided
                    birthday: dto.birthday ? new Date(dto.birthday) : null,
                    phone: dto.phone,
                    address: dto.address,
                    city: dto.city,
                    groupId
                }
            })

            return tx.customer.update({
                where: { id: record.id },
                data: { code: generateCode('KH', record.id) },
                include: {
                    group: true
                }
            })
        })

        return customer
    }

    /**
     * Get all customers with filters and pagination
     */
    async getAll(query: CustomerQueryDto) {
        const { page = 1, limit = 20 } = query
        const skip = (page - 1) * limit

        // Build where conditions
        const where: Prisma.CustomerWhereInput = {
            deletedAt: null
        }

        if (query.search) {
            where.OR = [
                { name: { contains: query.search, mode: 'insensitive' } },
                { code: { contains: query.search, mode: 'insensitive' } },
                { phone: { contains: query.search } }
            ]
        }

        if (query.isActive !== undefined) {
            where.isActive = query.isActive
        }

        if (query.groupId) {
            where.groupId = Number(query.groupId)
        }

        if (query.gender) {
            where.gender = query.gender
        }

        if (query.city) {
            where.city = { contains: query.city, mode: 'insensitive' }
        }

        // Build orderBy
        const orderBy = query.sort
            ? (Object.entries(query.sort).map(([key, value]) => ({ [key]: value.toLowerCase() })) as any)
            : { createdAt: 'desc' }

        const [customers, total, stats] = await Promise.all([
            prisma.customer.findMany({
                where,
                orderBy,
                skip,
                take: limit,
                include: {
                    group: true,
                    _count: {
                        select: { orders: true }
                    }
                }
            }),
            prisma.customer.count({ where }),
            // Calculate aggregate statistics (excluding pagination)
            prisma.customer.aggregate({
                where,
                _count: {
                    _all: true
                },
                _sum: {
                    totalSpent: true
                }
            })
        ])

        return {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            // Statistics from filtered results (excluding pagination)
            statistics: {
                totalActiveCustomers: stats._count._all,
                totalRevenue: Number(stats._sum.totalSpent || 0)
            },
            customers: customers.map((c) => ({
                id: c.id,
                code: c.code,
                name: c.name,
                gender: c.gender,
                birthday: c.birthday,
                phone: c.phone,
                address: c.address,
                city: c.city,
                groupName: c.group.name,
                totalOrders: c.totalOrders,
                totalSpent: Number(c.totalSpent),
                isActive: c.isActive,
                createdAt: c.createdAt,
                updatedAt: c.updatedAt
            }))
        }
    }

    /**
     * Get customer by ID
     */
    async getById(id: number) {
        const customer = await prisma.customer.findFirst({
            where: { id, deletedAt: null },
            include: {
                group: true,
                orders: {
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                    select: {
                        id: true,
                        orderCode: true,
                        createdAt: true,
                        totalAmount: true,
                        status: true
                    }
                },
                _count: {
                    select: { orders: true }
                }
            }
        })

        if (!customer) {
            throw new NotFoundRequestError('Không tìm thấy khách hàng')
        }

        return {
            id: customer.id,
            code: customer.code,
            name: customer.name,
            gender: customer.gender,
            birthday: customer.birthday,
            phone: customer.phone,
            address: customer.address,
            city: customer.city,
            groupName: customer.group.name,
            totalOrders: customer.totalOrders,
            totalSpent: Number(customer.totalSpent),
            isActive: customer.isActive,
            createdAt: customer.createdAt,
            updatedAt: customer.updatedAt,
            recentOrders: customer.orders.map((o) => ({
                id: o.id,
                orderCode: o.orderCode,
                createdAt: o.createdAt,
                totalAmount: Number(o.totalAmount),
                status: o.status
            }))
        }
    }

    /**
     * Update customer
     */
    async update(id: number, dto: UpdateCustomerDto) {
        const customer = await prisma.customer.findFirst({
            where: { id, deletedAt: null }
        })

        if (!customer) {
            throw new NotFoundRequestError('Không tìm thấy khách hàng')
        }

        // Check phone uniqueness if updating
        if (dto.phone && dto.phone !== customer.phone) {
            const existing = await prisma.customer.findFirst({
                where: {
                    phone: dto.phone,
                    deletedAt: null,
                    id: { not: id }
                }
            })
            if (existing) {
                throw new BadRequestError({ message: 'Số điện thoại đã được sử dụng' })
            }
        }

        const updated = await prisma.customer.update({
            where: { id },
            data: {
                ...dto,
                birthday: dto.birthday ? new Date(dto.birthday) : undefined
            },
            include: {
                group: true
            }
        })

        return {
            ...updated,
            totalSpent: Number(updated.totalSpent)
        }
    }

    /**
     * Delete customer (soft delete)
     */
    async delete(id: number) {
        const customer = await prisma.customer.findFirst({
            where: { id, deletedAt: null },
            include: {
                _count: {
                    select: { orders: true }
                }
            }
        })

        if (!customer) {
            throw new NotFoundRequestError('Không tìm thấy khách hàng')
        }

        // Check if customer has orders
        if (customer._count.orders > 0) {
            throw new BadRequestError({
                message: 'Không thể xóa khách hàng đã có đơn hàng. Hãy vô hiệu hóa thay vì xóa.'
            })
        }

        await prisma.customer.update({
            where: { id },
            data: { deletedAt: new Date() }
        })

        return { message: 'Xóa khách hàng thành công' }
    }

    /**
     * Assign customer to appropriate group based on their stats
     * Handles both upgrade and downgrade
     * This is called after an order is completed or during periodic checks
     */
    async assignCustomerGroup(customerId: number, tx?: any) {
        const prismaClient = tx || prisma

        const customer = await prismaClient.customer.findUnique({
            where: { id: customerId },
            include: { group: true }
        })

        if (!customer || !customer.group) return

        // Calculate stats within the window period
        const windowStart = subMonths(new Date(), customer.group.windowMonths)

        const stats = await prismaClient.order.aggregate({
            where: {
                customerId: customer.id,
                createdAt: { gte: windowStart },
                status: 'completed'
            },
            _sum: { totalAmount: true },
            _count: true
        })

        const totalOrders = stats._count || 0
        const totalSpent = Number(stats._sum.totalAmount || 0)

        // Find eligible group
        const eligibleGroup = await customerGroupService.findEligibleGroup(totalOrders, totalSpent)

        // Update if different from current group
        if (eligibleGroup.id !== customer.groupId) {
            await prismaClient.customer.update({
                where: { id: customerId },
                data: { groupId: eligibleGroup.id }
            })
        }
    }
}

export const customerService = new CustomerService()
