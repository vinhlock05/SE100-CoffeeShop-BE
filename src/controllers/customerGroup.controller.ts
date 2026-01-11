import { Request, Response, NextFunction } from 'express'
import { SuccessResponse } from '~/core/success.response'
import customerGroupService from '~/services/customerGroup.service'
import { CreateCustomerGroupDto, UpdateCustomerGroupDto, CustomerGroupQueryDto } from '~/dtos/customerGroup'
import { validate } from 'class-validator'
import { plainToInstance } from 'class-transformer'

class CustomerGroupController {
    /**
     * Get all customer groups
     */
    async getAll(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await customerGroupService.getAllGroups({
                ...req.query,
                ...req.parseQueryPagination,
                sort: req.sortParsed
            })

            new SuccessResponse({
                message: 'Lấy danh sách nhóm khách hàng thành công',
                metaData: result
            }).send(res)
        } catch (error) {
            next(error)
        }
    }

    /**
     * Get customer group by ID
     */
    async getById(req: Request, res: Response, next: NextFunction) {
        try {
            const id = parseInt(req.params.id)
            const group = await customerGroupService.getGroupById(id)

            new SuccessResponse({
                message: 'Lấy thông tin nhóm khách hàng thành công',
                metaData: { group }
            }).send(res)
        } catch (error) {
            next(error)
        }
    }

    /**
     * Create new customer group
     */
    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const dto = plainToInstance(CreateCustomerGroupDto, req.body)
            const errors = await validate(dto)

            if (errors.length > 0) {
                return res.status(400).json({ errors })
            }

            const group = await customerGroupService.createGroup(dto)

            new SuccessResponse({
                message: 'Tạo nhóm khách hàng thành công',
                metaData: { group },
                statusCode: 201
            }).send(res)
        } catch (error) {
            next(error)
        }
    }

    /**
     * Update customer group
     */
    async update(req: Request, res: Response, next: NextFunction) {
        try {
            const id = parseInt(req.params.id)
            const dto = plainToInstance(UpdateCustomerGroupDto, req.body)
            const errors = await validate(dto)

            if (errors.length > 0) {
                return res.status(400).json({ errors })
            }

            const group = await customerGroupService.updateGroup(id, dto)

            new SuccessResponse({
                message: 'Cập nhật nhóm khách hàng thành công',
                metaData: { group }
            }).send(res)
        } catch (error) {
            next(error)
        }
    }

    /**
     * Delete customer group
     */
    async delete(req: Request, res: Response, next: NextFunction) {
        try {
            const id = parseInt(req.params.id)
            await customerGroupService.deleteGroup(id)

            new SuccessResponse({
                message: 'Xóa nhóm khách hàng thành công'
            }).send(res)
        } catch (error) {
            next(error)
        }
    }
}

export const customerGroupController = new CustomerGroupController()
