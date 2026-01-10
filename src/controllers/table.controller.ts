import { Request, Response } from 'express'
import { tableService } from '~/services/table.service'
import { SuccessResponse, CREATED } from '~/core/success.response'

class TableController {
    /**
     * GET /api/tables
     * Get all tables
     */
    /**
     * GET /api/tables
     * Get all tables
     * Query params:
     * - q: search by table name
     * - areaId: filter by area
     * - status: filter by status (active/inactive) or isActive (true/false)
     */
    getAllTables = async (req: Request, res: Response) => {
        return new SuccessResponse({
            message: 'Get tables successfully',
            metaData: await tableService.getAllTables({
                ...req.query,
                ...req.parseQueryPagination,
                ...req.parseQueryBoolean,
                sort: req.sortParsed
            })
        }).send(res)
    }

    /**
     * GET /api/tables/:id
     * Get table by ID
     */
    getTableById = async (req: Request, res: Response) => {
        const id = parseInt(req.params.id)
        const result = await tableService.getTableById(id)

        return new SuccessResponse({
            message: 'Get table successfully',
            metaData: result
        }).send(res)
    }

    /**
     * POST /api/tables
     * Create a new table
     */
    createTable = async (req: Request, res: Response) => {
        const result = await tableService.createTable(req.body)

        return new CREATED({
            message: 'Table created successfully',
            metaData: result
        }).send(res)
    }

    /**
     * PATCH /api/tables/:id
     * Update table by ID
     */
    updateTable = async (req: Request, res: Response) => {
        const id = parseInt(req.params.id)
        const result = await tableService.updateTableById(id, req.body)

        return new SuccessResponse({
            message: 'Table updated successfully',
            metaData: result
        }).send(res)
    }

    /**
     * DELETE /api/tables/:id
     * Delete table by ID
     */
    deleteTable = async (req: Request, res: Response) => {
        const id = parseInt(req.params.id)
        const result = await tableService.deleteTableById(id)

        return new SuccessResponse({
            message: result.message
        }).send(res)
    }
}

export const tableController = new TableController()
