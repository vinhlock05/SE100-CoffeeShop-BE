import { checkSchema } from 'express-validator'
import { validate } from '../validation.middleware'

/**
 * Validation for applying promotion to an order
 * Only requires promotionId and orderId
 * customerId and orderItems are fetched from the order in DB
 */
export const applyPromotionValidation = validate(
    checkSchema(
        {
            promotionId: {
                notEmpty: {
                    errorMessage: 'ID khuyến mãi là bắt buộc'
                },
                isInt: {
                    errorMessage: 'ID khuyến mãi phải là số nguyên'
                },
                toInt: true
            },
            orderId: {
                notEmpty: {
                    errorMessage: 'ID đơn hàng là bắt buộc'
                },
                isInt: {
                    errorMessage: 'ID đơn hàng phải là số nguyên'
                },
                toInt: true
            }
            // Note: customerId and orderItems are NOT required
            // They are fetched from the order record in the database
        },
        ['body']
    )
)
