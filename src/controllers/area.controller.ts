import { Request, Response } from 'express'
import { areaService } from '~/services/area.service'
import { SuccessResponse, CREATED } from '~/core/success.response'

class AreaController {
    /**
     * GET /api/areas
     * Get all areas
     */
    getAllAreas = async (req: Request, res: Response) => {
        return new SuccessResponse({
            message: 'Get areas successfully',
            metaData: await areaService.getAllAreas({
                ...req.query,
                ...req.parseQueryPagination,
                ...req.parseQueryBoolean,
                sort: req.sortParsed
            })
        }).send(res)
    }

    /**
     * GET /api/areas/:id
     * Get area by ID
     */
    getAreaById = async (req: Request, res: Response) => {
        const id = parseInt(req.params.id)
        const result = await areaService.getAreaById(id)

        return new SuccessResponse({
            message: 'Get area successfully',
            metaData: result
        }).send(res)
    }

    /**
     * POST /api/areas
     * Create a new area
     */
    createArea = async (req: Request, res: Response) => {
        const result = await areaService.createArea(req.body)

        return new CREATED({
            message: 'Area created successfully',
            metaData: result
        }).send(res)
    }

    /**
     * PATCH /api/areas/:id
     * Update area by ID
     */
    updateArea = async (req: Request, res: Response) => {
        const id = parseInt(req.params.id)
        const result = await areaService.updateAreaById(id, req.body)

        return new SuccessResponse({
            message: 'Area updated successfully',
            metaData: result
        }).send(res)
    }

    /**
     * DELETE /api/areas/:id
     * Delete area by ID
     */
    deleteArea = async (req: Request, res: Response) => {
        const id = parseInt(req.params.id)
        const result = await areaService.deleteAreaById(id)

        return new SuccessResponse({
            message: result.message
        }).send(res)
    }
}

export const areaController = new AreaController()
