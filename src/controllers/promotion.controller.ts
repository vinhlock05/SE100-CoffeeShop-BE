import { Request, Response, NextFunction } from 'express'
import { SuccessResponse } from '~/core/success.response'
import { NotFoundRequestError, BadRequestError } from '~/core/error.response'
import { promotionService } from '~/services/promotion.service'

class PromotionController {
    /**
   * Get all promotions with pagination
   */
    async getAll(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await promotionService.getAll({
                ...req.query,
                ...req.parseQueryPagination,
                ...req.parseQueryBoolean,
                sort: req.sortParsed
            })

            new SuccessResponse({
                message: 'Lấy danh sách khuyến mãi thành công',
                metaData: result
            }).send(res)
        } catch (error) {
            next(error)
        }
    }

    /**
     * Get promotion by ID with statistics
     */
    async getById(req: Request, res: Response, next: NextFunction) {
        try {
            const id = parseInt(req.params.id)

            new SuccessResponse({
                message: 'Lấy thông tin khuyến mãi thành công',
                metaData: await promotionService.getPromotionById(id)
            }).send(res)
        } catch (error) {
            next(error)
        }
    }

    /**
     * Get available promotions for an order
     */
    async getAvailablePromotions(req: Request, res: Response, next: NextFunction) {
        try {
            const { customerId, orderId } = req.body

            const promotions = await promotionService.getAvailablePromotions(
                customerId ?? null, // Convert undefined to null for walk-in customers
                orderId
            )

            new SuccessResponse({
                message: 'Lấy danh sách khuyến mãi khả dụng thành công',
                metaData: { promotions }
            }).send(res)
        } catch (error) {
            next(error)
        }
    }

    /**
     * Create new promotion
     */
    async create(req: Request, res: Response, next: NextFunction) {
        try {
            // const promotion = await promotionService.createPromotion(req.body)

            new SuccessResponse({
                message: 'Tạo khuyến mãi thành công',
                metaData: await promotionService.createPromotion(req.body) || {}
            }).send(res)
        } catch (error) {
            next(error)
        }
    }

    /**
     * Update promotion
     */
    async update(req: Request, res: Response, next: NextFunction) {
        try {
            const id = parseInt(req.params.id)

            new SuccessResponse({
                message: 'Cập nhật khuyến mãi thành công',
                metaData: await promotionService.updatePromotion(id, req.body)  || {}
            }).send(res)
        } catch (error) {
            next(error)
        }
    }

    /**
     * Delete promotion (soft delete)
     */
    async delete(req: Request, res: Response, next: NextFunction) {
        try {
            const id = parseInt(req.params.id)
            await promotionService.deletePromotion(id)

            new SuccessResponse({
                message: 'Xóa khuyến mãi thành công'
            }).send(res)
        } catch (error) {
            next(error)
        }
    }

    /**
     * Apply promotion to order
     */
    async apply(req: Request, res: Response, next: NextFunction) {
        try {
            const { promotionId, orderId } = req.body

            const result = await promotionService.applyPromotion(
                promotionId,
                orderId
            )

            new SuccessResponse({
                message: 'Áp dụng khuyến mãi thành công',
                metaData: result
            }).send(res)
        } catch (error) {
            next(error)
        }
    }

    /**
     * Remove promotion from order
     */
    async unapply(req: Request, res: Response, next: NextFunction) {
        try {
            const { promotionId, orderId } = req.body

            const result = await promotionService.unapplyPromotion(
                promotionId,
                orderId
            )

            new SuccessResponse({
                message: result.message,
                metaData: result
            }).send(res)
        } catch (error) {
            next(error)
        }
    }

    /**
     * Check if customer can use promotion
     */
    async checkEligibility(req: Request, res: Response, next: NextFunction) {
        try {
            const promotionId = parseInt(req.params.id)
            const customerId = parseInt(req.query.customerId as string)

            if (!customerId) {
                throw new BadRequestError({ message: 'customerId is required' })
            }

            const result = await promotionService.canUsePromotion(promotionId, customerId)

            new SuccessResponse({
                message: result.eligible ? 'Khách hàng có thể sử dụng khuyến mãi' : 'Khách hàng không thể sử dụng khuyến mãi',
                metaData: {
                    eligible: result.eligible,
                    reason: result.reason
                }
            }).send(res)
        } catch (error) {
            next(error)
        }
    }
}

export const promotionController = new PromotionController()
