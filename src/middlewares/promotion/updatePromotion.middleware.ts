import { Request, Response, NextFunction } from 'express'
import { checkSchema } from 'express-validator'
import { validate } from '../validation.middleware'
import { validateGiftPromotion, validateCustomerUsageLimit, validateProductScope } from './createPromotion.middleware'
import { validateDateRange } from '../common.middlewares'

const updatePromotionSchema = validate(
    checkSchema(
        {
            name: {
                optional: true,
                trim: true,
                isLength: {
                    options: { min: 1, max: 200 },
                    errorMessage: 'Tên khuyến mãi không được vượt quá 200 ký tự'
                }
            },
            description: {
                optional: true,
                trim: true,
                isLength: {
                    options: { max: 1000 },
                    errorMessage: 'Mô tả không được vượt quá 1000 ký tự'
                }
            },
            discountValue: {
                optional: true,
                isFloat: {
                    options: { min: 0 },
                    errorMessage: 'Giá trị giảm giá phải >= 0'
                },
                toFloat: true
            },
            minOrderValue: {
                optional: true,
                isFloat: {
                    options: { min: 0 },
                    errorMessage: 'Giá trị đơn tối thiểu phải >= 0'
                },
                toFloat: true
            },
            maxDiscount: {
                optional: true,
                isFloat: {
                    options: { min: 0 },
                    errorMessage: 'Giảm tối đa phải >= 0'
                },
                toFloat: true
            },
            buyQuantity: {
                optional: true,
                isInt: {
                    options: { min: 1 },
                    errorMessage: 'Số lượng mua phải >= 1'
                },
                toInt: true
            },
            getQuantity: {
                optional: true,
                isInt: {
                    options: { min: 1 },
                    errorMessage: 'Số lượng tặng phải >= 1'
                },
                toInt: true
            },
            requireSameItem: {
                optional: true,
                isBoolean: {
                    errorMessage: 'requireSameItem phải là boolean'
                },
                toBoolean: true
            },

            startDateTime: {
                optional: true,
                isISO8601: {
                    errorMessage: 'Ngày bắt đầu phải là định dạng ISO 8601'
                }
            },
            endDateTime: {
                optional: true,
                isISO8601: {
                    errorMessage: 'Ngày kết thúc phải là định dạng ISO 8601'
                }
            },
            maxTotalUsage: {
                optional: true,
                isInt: {
                    options: { min: 1 },
                    errorMessage: 'Giới hạn tổng phải >= 1'
                },
                toInt: true
            },
            maxUsagePerCustomer: {
                optional: true,
                isInt: {
                    options: { min: 1 },
                    errorMessage: 'Giới hạn per customer phải >= 1'
                },
                toInt: true
            },
            isActive: {
                optional: true,
                isBoolean: {
                    errorMessage: 'Trạng thái hoạt động phải là boolean'
                },
                toBoolean: true
            }
        },
        ['body']
    )
)

/**
 * Combined validation middleware for update promotion
 * Includes: schema validation + business rule validations
 */
export const updatePromotionValidation = [
    updatePromotionSchema,
    validateDateRange,
    validateGiftPromotion,
    validateCustomerUsageLimit,
    validateProductScope
]
