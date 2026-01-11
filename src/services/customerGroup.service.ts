import { prisma } from '~/config/database'
import { BadRequestError, NotFoundRequestError } from '~/core/error.response'
import { CreateCustomerGroupDto, UpdateCustomerGroupDto, CustomerGroupQueryDto } from '~/dtos/customerGroup'
import { generateCode } from '~/utils/helpers'
import { Prisma, CustomerGroup } from '@prisma/client'
import { customerService } from './customer.service'

class CustomerGroupService {
    /**
     * Get all customer groups with optional filtering
     */
    async getAllGroups(query: CustomerGroupQueryDto) {
        const { search, sort, limit = 20, page = 1 } = query
        const skip = (page - 1) * limit

        const where: Prisma.CustomerGroupWhereInput = {
            deletedAt: null,
            ...(search && {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { description: { contains: search, mode: 'insensitive' } }
                ]
            })
        }

        const [groupsData, total] = await Promise.all([
            prisma.customerGroup.findMany({
                where,
                orderBy: sort
                    ? Object.entries(sort).map(([key, value]) => ({ [key]: value.toLowerCase() }))
                    : { priority: 'desc' },
                include: {
                    _count: {
                        select: { customers: true }
                    }
                },
                skip,
                take: limit
            }),
            prisma.customerGroup.count({ where })
        ])

        // Transform _count to customerCount and convert Decimal to number
        const groups = groupsData.map(({ _count, ...group }) => ({
            ...group,
            minSpend: group.minSpend ? Number(group.minSpend) : 0,
            customerCount: _count.customers
        }))

        return {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            groups
        }
    }

    /**
     * Get customer group by ID
     */
    async getGroupById(id: number) {
        const group = await prisma.customerGroup.findFirst({
            where: {
                id,
                deletedAt: null
            },
            include: {
                _count: {
                    select: { customers: true }
                }
            }
        })

        if (!group) {
            throw new NotFoundRequestError('Không tìm thấy nhóm khách hàng')
        }

        // Transform _count to customerCount and convert Decimal to number
        const { _count, ...groupData } = group
        return {
            ...groupData,
            minSpend: group.minSpend ? Number(group.minSpend) : 0,
            customerCount: _count.customers
        }
    }

    /**
     * Create new customer group
     */
    async createGroup(data: CreateCustomerGroupDto) {
        // Check if name already exists
        const existingGroup = await prisma.customerGroup.findFirst({
            where: {
                name: data.name,
                deletedAt: null
            }
        })

        if (existingGroup) {
            throw new BadRequestError({ message: 'Tên nhóm khách hàng đã tồn tại' })
        }

        // Check if priority already exists
        if (data.priority !== undefined) {
            const existingPriority = await prisma.customerGroup.findFirst({
                where: {
                    priority: data.priority,
                    deletedAt: null
                }
            })

            if (existingPriority) {
                throw new BadRequestError({ message: 'Độ ưu tiên đã được sử dụng bởi nhóm khác' })
            }
        }

        // Create with temp code, then update with generated code
        const group = await prisma.$transaction(async (tx) => {
            const record = await tx.customerGroup.create({
                data: {
                    code: 'TEMP',
                    name: data.name,
                    description: data.description,
                    priority: data.priority ?? 0,
                    minSpend: data.minSpend ?? 0,
                    minOrders: data.minOrders ?? 0,
                    windowMonths: data.windowMonths ?? 12
                }
            })

            return tx.customerGroup.update({
                where: { id: record.id },
                data: { code: generateCode('NKH', record.id) }
            })
        })

        // Reassign all customers to ensure they're in correct groups
        await this.reassignAllCustomers()

        return group
    }

    /**
     * Update customer group
     */
    async updateGroup(id: number, data: UpdateCustomerGroupDto) {
        // Check if group exists
        const group = await this.getGroupById(id)
        if (!group) {
            throw new NotFoundRequestError('Không tìm thấy nhóm khách hàng')
        }

        // Prevent updating default group (priority = 0)
        if (group.priority === 0) {
            throw new BadRequestError({ message: 'Không thể chỉnh sửa nhóm khách hàng mặc định' })
        }

        // Check if new name already exists (if name is being updated)
        if (data.name && data.name !== group.name) {
            const existingGroup = await prisma.customerGroup.findFirst({
                where: {
                    name: data.name,
                    deletedAt: null,
                    id: { not: id }
                }
            })

            if (existingGroup) {
                throw new BadRequestError({ message: 'Tên nhóm khách hàng đã tồn tại' })
            }
        }

        // Check if new priority already exists (if priority is being updated)
        if (data.priority !== undefined && data.priority !== group.priority) {
            const existingPriority = await prisma.customerGroup.findFirst({
                where: {
                    priority: data.priority,
                    deletedAt: null,
                    id: { not: id }
                }
            })

            if (existingPriority) {
                throw new BadRequestError({ message: 'Độ ưu tiên đã được sử dụng bởi nhóm khác' })
            }
        }

        const updatedGroup = await prisma.customerGroup.update({
            where: { id },
            data
        })

        // Reassign all customers to ensure they're in correct groups
        await this.reassignAllCustomers()

        return updatedGroup
    }

    /**
     * Delete customer group (soft delete)
     */
    async deleteGroup(id: number) {
        // Check if group exists
        const group = await this.getGroupById(id)
        if (!group) {
            throw new NotFoundRequestError('Không tìm thấy nhóm khách hàng')
        }

        // Prevent deleting default group (priority = 0)
        if (group.priority === 0) {
            throw new BadRequestError({ message: 'Không thể xóa nhóm khách hàng mặc định' })
        }

        // Get all customers in this group
        const customers = await prisma.customer.findMany({
            where: {
                groupId: id,
                deletedAt: null
            }
        })

        // Reassign customers to appropriate groups
        if (customers.length > 0) {
            for (const customer of customers) {
                await customerService.assignCustomerGroup(customer.id)
            }
        }

        // Soft delete the group
        await prisma.customerGroup.update({
            where: { id },
            data: { deletedAt: new Date() }
        })
    }

    /**
     * Find the highest priority group that a customer qualifies for
     * based on their total orders and total spent in the window period
     */
    async findEligibleGroup(totalOrders: number, totalSpent: number): Promise<CustomerGroup> {
        // Get all groups ordered by priority (highest first)
        const groups = await prisma.customerGroup.findMany({
            where: {
                deletedAt: null
            },
            orderBy: {
                priority: 'desc'
            }
        })

        // Find the first group the customer qualifies for
        for (const group of groups) {
            if (totalOrders >= group.minOrders && totalSpent >= parseFloat(group.minSpend.toString())) {
                return group
            }
        }

        // If no group matches, return the lowest priority group (default)
        return groups[groups.length - 1]
    }

    /**
     * Get default customer group (lowest priority)
     */
    async getDefaultGroup() {
        const defaultGroup = await prisma.customerGroup.findFirst({
            where: {
                deletedAt: null
            },
            orderBy: {
                priority: 'asc'
            }
        })

        if (!defaultGroup) {
            throw new BadRequestError({ message: 'Không tìm thấy nhóm khách hàng mặc định. Vui lòng tạo ít nhất một nhóm.' })
        }

        return defaultGroup
    }

    /**
     * Reassign all customers to appropriate groups based on their stats
     */
    async reassignAllCustomers() {
        const customers = await prisma.customer.findMany({
            where: { deletedAt: null }
        })

        for (const customer of customers) {
            await customerService.assignCustomerGroup(customer.id)
        }

        return { reassignedCount: customers.length }
    }
}

export default new CustomerGroupService()
