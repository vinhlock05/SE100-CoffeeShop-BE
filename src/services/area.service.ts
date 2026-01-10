import { prisma } from '~/config/database'
import { BadRequestError, NotFoundRequestError } from '~/core/error.response'
import { CreateAreaDto, UpdateAreaDto } from '~/dtos/area'

export class AreaService {
    /**
     * Get all areas
     */
    /**
     * Get all areas with pagination and sorting
     */
    async getAllAreas(filters?: {
        page?: number,
        limit?: number,
        sort?: Record<string, 'ASC' | 'DESC'>
    }) {
        const { page = 1, limit = 20, sort } = filters || {}
        const skip = (page - 1) * limit

        const where: any = { deletedAt: null }

        const [areas, total] = await Promise.all([
            prisma.tableArea.findMany({
                where,
                orderBy: sort ? Object.entries(sort).map(([key, value]) => ({ [key]: value.toLowerCase() })) : { createdAt: 'asc' },
                skip,
                take: limit
            }),
            prisma.tableArea.count({ where })
        ])

        return {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            items: areas,
        }
    }

    /**
     * Get area by ID
     */
    async getAreaById(id: number) {
        const area = await prisma.tableArea.findUnique({
            where: { id }
        })

        if (!area || area.deletedAt) {
            throw new NotFoundRequestError('Area not found')
        }

        return area
    }

    /**
     * Create a new area
     */
    async createArea(dto: CreateAreaDto) {
        // Check if area name already exists
        const existingArea = await prisma.tableArea.findFirst({
            where: {
                name: dto.name,
                deletedAt: null
            }
        })

        if (existingArea) {
            throw new BadRequestError({ message: 'Area name already exists' })
        }

        const area = await prisma.tableArea.create({
            data: {
                name: dto.name
            }
        })

        return area
    }

    /**
     * Update area by ID
     */
    async updateAreaById(id: number, dto: UpdateAreaDto) {
        // Check if area exists
        const existingArea = await prisma.tableArea.findUnique({
            where: { id }
        })

        if (!existingArea || existingArea.deletedAt) {
            throw new NotFoundRequestError('Area not found')
        }

        // Check if name is being changed and already exists
        if (dto.name && dto.name !== existingArea.name) {
            const duplicateName = await prisma.tableArea.findFirst({
                where: {
                    name: dto.name,
                    deletedAt: null
                }
            })
            if (duplicateName) {
                throw new BadRequestError({ message: 'Area name already exists' })
            }
        }

        const area = await prisma.tableArea.update({
            where: { id },
            data: {
                name: dto.name
            }
        })

        return area
    }

    /**
     * Delete area by ID (soft delete)
     */
    async deleteAreaById(id: number) {
        // Check if area exists
        const existingArea = await prisma.tableArea.findUnique({
            where: { id }
        })

        if (!existingArea || existingArea.deletedAt) {
            throw new NotFoundRequestError('Area not found')
        }

        // Check if area has tables
        const tablesInArea = await prisma.table.count({
            where: { areaId: id, deletedAt: null }
        })

        if (tablesInArea > 0) {
            throw new BadRequestError({
                message: `Cannot delete area. ${tablesInArea} table(s) are assigned to this area.`
            })
        }

        await prisma.tableArea.update({
            where: { id },
            data: { deletedAt: new Date() }
        })

        return { message: 'Area deleted successfully' }
    }
}

export const areaService = new AreaService()
