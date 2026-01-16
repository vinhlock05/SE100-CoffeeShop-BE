import { checkSchema } from 'express-validator'
import { validate } from '../validation.middleware'

export const applyPromotionValidation = validate(
    checkSchema(
        {
            promotionId: {
                isInt: {
                    errorMessage: 'ID khuyến mãi phải là số nguyên'
                },
                toInt: true
            },
            customerId: {
                isInt: {
                    errorMessage: 'ID khách hàng phải là số nguyên'
                },
                toInt: true
            },
            orderId: {
                isInt: {
                    errorMessage: 'ID đơn hàng phải là số nguyên'
                },
                toInt: true
            },
            orderItems: {
                isArray: {
                    errorMessage: 'orderItems phải là mảng'
                },
                custom: {
                    options: (value) => {
                        if (!Array.isArray(value) || value.length === 0) {
                            throw new Error('orderItems không được rỗng')
                        }
                        for (const item of value) {
                            if (!item.itemId || !item.quantity || !item.price) {
                                throw new Error('Mỗi item phải có itemId, quantity, và price')
                            }
                        }
                        return true
                    }
                }
            }
        },
        ['body']
    )
)
