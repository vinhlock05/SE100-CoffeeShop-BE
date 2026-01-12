import { Request, Response, NextFunction } from 'express'
import { SuccessResponse } from '~/core/success.response'
import { customerService } from '~/services/customer.service'
import { CreateCustomerDto, UpdateCustomerDto, CustomerQueryDto } from '~/dtos/customer'
import { validate } from 'class-validator'
import { plainToInstance } from 'class-transformer'

class CustomerController {
    /**
     * Get all customers with pagination
     */
    async getAll(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await customerService.getAll({
                ...req.query,
                ...req.parseQueryPagination,
                ...req.parseQueryBoolean,
                sort: req.sortParsed
            })

            new SuccessResponse({
                message: 'Lấy danh sách khách hàng thành công',
                metaData: result
            }).send(res)
        } catch (error) {
            next(error)
        }
    }

    /**
     * Get customer by ID
     */
    async getById(req: Request, res: Response, next: NextFunction) {
        try {
            const id = parseInt(req.params.id)
            const customer = await customerService.getById(id)

            new SuccessResponse({
                message: 'Lấy thông tin khách hàng thành công',
                metaData: { customer }
            }).send(res)
        } catch (error) {
            next(error)
        }
    }

    /**
     * Create new customer
     */
    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const dto = plainToInstance(CreateCustomerDto, req.body)
            const errors = await validate(dto)

            if (errors.length > 0) {
                return res.status(400).json({ errors })
            }

            const customer = await customerService.create(dto)

            new SuccessResponse({
                message: 'Tạo khách hàng thành công',
                metaData: { customer },
                statusCode: 201
            }).send(res)
        } catch (error) {
            next(error)
        }
    }

    /**
     * Update customer
     */
    async update(req: Request, res: Response, next: NextFunction) {
        try {
            const id = parseInt(req.params.id)
            const dto = plainToInstance(UpdateCustomerDto, req.body)
            const errors = await validate(dto)

            if (errors.length > 0) {
                return res.status(400).json({ errors })
            }

            const customer = await customerService.update(id, dto)

            new SuccessResponse({
                message: 'Cập nhật khách hàng thành công',
                metaData: { customer }
            }).send(res)
        } catch (error) {
            next(error)
        }
    }

    /**
     * Delete customer
     */
    async delete(req: Request, res: Response, next: NextFunction) {
        try {
            const id = parseInt(req.params.id)
            await customerService.delete(id)

            new SuccessResponse({
                message: 'Xóa khách hàng thành công'
            }).send(res)
        } catch (error) {
            next(error)
        }
    }
}

export const customerController = new CustomerController()
