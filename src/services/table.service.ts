import { prisma } from '~/config/database'
import { BadRequestError, NotFoundRequestError } from '~/core/error.response'
import { CreateTableDto, UpdateTableDto, GetAllTablesQuery } from '~/dtos/table'
import { TableStatus } from '~/enums'

export class TableService {
    /**
     * Get all tables with filters, pagination, and sorting
     */
    async getAllTables({
        page = 1,
        limit = 20,
        q,
        areaId,
        isActive,
        sort
    }: GetAllTablesQuery) {
        const skip = (page - 1) * limit

        const where: any = { deletedAt: null }

        // Filter by Area
        if (areaId) {
            where.areaId = Number(areaId)
        }

        // Filter by Status (isActive)
        if (isActive !== undefined) {
            where.isActive = isActive
        }

        // Search by name
        if (q) {
            where.tableName = {
                contains: q,
                mode: 'insensitive'
            }
        }

        // Execute query with pagination
        const [tables, total] = await Promise.all([
            prisma.table.findMany({
                where,
                include: {
                    area: true
                },
                orderBy: sort ? Object.entries(sort).map(([key, value]) => ({ [key]: value.toLowerCase() })) : { tableName: 'asc' },
                skip,
                take: limit
            }),
            prisma.table.count({ where })
        ])

        return {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            items: tables.map(table => {
                const { area, ...rest } = table
                return {
                    ...rest,
                    areaName: area?.name
                }
            }),
        }
    }

    /**
     * Get table by ID
     */
    async getTableById(id: number) {
        const table = await prisma.table.findUnique({
            where: { id },
            include: {
                area: true
            }
        })

        if (!table || table.deletedAt) {
            throw new NotFoundRequestError('Table not found')
        }

        const { area, ...rest } = table
        return {
            ...rest,
            areaName: area?.name
        }
    }

    /**
   * Helper: Ensure area exists
   */
    private async ensureAreaExists(areaId: number) {
        const area = await prisma.tableArea.findUnique({
            where: { id: areaId }
        })
        if (!area || area.deletedAt) {
            throw new NotFoundRequestError('Area not found')
        }
    }

    /**
     * Create a new table
     */
    async createTable(dto: CreateTableDto) {
        // Check if table name already exists
        const existingTable = await prisma.table.findFirst({
            where: {
                tableName: dto.tableName,
                deletedAt: null
            }
        })

        if (existingTable) {
            throw new BadRequestError({ message: 'Table name already exists' })
        }

        // Validate Area if provided
        if (dto.areaId) {
            await this.ensureAreaExists(dto.areaId)
        }

        const table = await prisma.table.create({
            data: {
                tableName: dto.tableName,
                areaId: dto.areaId,
                capacity: dto.capacity,
                isActive: dto.isActive ?? true,
                currentStatus: (dto.currentStatus as 'available' | 'occupied') ?? 'available'
            },
            include: {
                area: true
            }
        })

        const { area, ...rest } = table
        return {
            ...rest,
            areaName: area?.name
        }
    }

    /**
     * Update table by ID
     */
    async updateTableById(id: number, dto: UpdateTableDto) {
        // Check if table exists
        const existingTable = await prisma.table.findUnique({
            where: { id }
        })

        if (!existingTable || existingTable.deletedAt) {
            throw new NotFoundRequestError('Table not found')
        }

        // Check if name is being changed and already exists
        if (dto.tableName && dto.tableName !== existingTable.tableName) {
            const duplicateName = await prisma.table.findFirst({
                where: {
                    tableName: dto.tableName,
                    deletedAt: null
                }
            })
            if (duplicateName) {
                throw new BadRequestError({ message: 'Table name already exists' })
            }
        }

        // Prevent deactivating an occupied table
        if (dto.isActive === false && existingTable.currentStatus === TableStatus.OCCUPIED as any) { // Cast as any because existingTable.currentStatus is from Prisma
            throw new BadRequestError({ message: 'Cannot deactivate an occupied table' })
        }

        // Also check if we are updating status to occupied while trying to deactivate
        if (dto.isActive === false && dto.currentStatus === TableStatus.OCCUPIED) {
            throw new BadRequestError({ message: 'Cannot deactivate an occupied table' })
        }

        // Validate Area if provided
        if (dto.areaId) {
            await this.ensureAreaExists(dto.areaId)
        }

        const table = await prisma.table.update({
            where: { id },
            data: {
                tableName: dto.tableName,
                areaId: dto.areaId,
                capacity: dto.capacity,
                isActive: dto.isActive,
                currentStatus: dto.currentStatus as any // Cast to any to avoid Enum mismatch between custom and Prisma type
            },
            include: {
                area: true
            }
        })

        const { area, ...rest } = table
        return {
            ...rest,
            areaName: area?.name
        }
    }

    /**
     * Delete table by ID (soft delete)
     */
    async deleteTableById(id: number) {
        // Check if table exists
        const existingTable = await prisma.table.findUnique({
            where: { id }
        })

        if (!existingTable || existingTable.deletedAt) {
            throw new NotFoundRequestError('Table not found')
        }

        // Check if table has active orders (optional business rule)
        // For now, allowing delete but checking status might be good
        if (existingTable.currentStatus !== 'available') {
            // Ideally we should check for pending orders, but table status is a good proxy if maintained correctly
            // Or we can check order table
            const activeOrder = await prisma.order.findFirst({
                where: {
                    tableId: id,
                    status: { notIn: ['completed', 'cancelled'] }
                }
            })
            if (activeOrder) {
                throw new BadRequestError({ message: 'Cannot delete table with active orders' })
            }
        }

        await prisma.table.update({
            where: { id },
            data: { deletedAt: new Date() }
        })

        return { message: 'Table deleted successfully' }
    }
}

export const tableService = new TableService()
