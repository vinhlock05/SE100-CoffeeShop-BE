import { checkSchema } from 'express-validator'
import { validate } from '../validation.middleware'
import { isRequired, validateDateRange } from '../common.middlewares'
import { prisma } from '~/config/database'
import { BadRequestError } from '~/core'
import { Request, Response, NextFunction } from 'express'

export const createPromotionSchema = validate(
    checkSchema(
        {
            name: {
                trim: true,
                ...isRequired('Tên khuyến mãi'),
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
            typeId: {
                ...isRequired('Loại khuyến mãi'),
                isInt: {
                    errorMessage: 'Loại khuyến mãi phải là số nguyên từ 1 đến 4'
                },
                toInt: true
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
 * Validate gift promotion (typeId = 4)
 * Business rules:
 * - Must have at least one condition: minOrderValue OR buyQuantity
 * - getQuantity must be >= 1
 * - giftItemIds cannot be empty
 */
export const validateGiftPromotion = (req: Request, res: Response, next: NextFunction) => {
    const { typeId, minOrderValue, buyQuantity, getQuantity, giftItemIds } = req.body

    // Only validate if typeId = 4 (gift promotion)
    if (typeId !== 4) {
        return next()
    }

    // Check 1: Must have at least one condition
    const hasMinOrder = minOrderValue && minOrderValue > 0
    const hasBuyQuantity = buyQuantity && buyQuantity > 0

    if (!hasMinOrder && !hasBuyQuantity) {
        throw new BadRequestError({
            message: 'Khuyến mãi tặng quà phải có ít nhất một điều kiện: Giá trị đơn tối thiểu hoặc Số lượng mua'
        })
    }

    // Check 2: getQuantity must be >= 1
    if (!getQuantity || getQuantity < 1) {
        throw new BadRequestError({
            message: 'Số lượng tặng phải >= 1'
        })
    }

    // Check 3: giftItemIds cannot be empty
    if (!giftItemIds || giftItemIds.length === 0) {
        throw new BadRequestError({
            message: 'Phải chọn ít nhất 1 mặt hàng để tặng'
        })
    }

    next()
}

/**
 * Validate customer usage limit
 * Business rule: Cannot track usage for walk-in customers
 * If maxUsagePerCustomer is set, applyToWalkIn must be false
 */
export const validateCustomerUsageLimit = (req: Request, res: Response, next: NextFunction) => {
    const { maxUsagePerCustomer, applyToWalkIn } = req.body

    // If maxUsagePerCustomer is set (>= 1), walk-in must be disabled
    if (maxUsagePerCustomer && maxUsagePerCustomer >= 1 && applyToWalkIn === true) {
        throw new BadRequestError({
            message: 'Không thể giới hạn số lượt sử dụng cho khách vãng lai (không thể track usage). Vui lòng tắt "Cho phép khách vãng lai" hoặc bỏ giới hạn số lượt/khách.'
        })
    }

    next()
}

/**
 * Validate product scope consistency
 * Ensures promotion applies to EITHER items/categories OR combos, not both
 * 
 * Rules:
 * - Cannot have both (itemIds/categoryIds/item flags) AND (comboIds/combo flags)
 * - Must have at least one scope defined (flag OR array)
 * - When applyToAll flag is true, array values are ignored (no validation needed)
 */
export const validateProductScope = (req: Request, res: Response, next: NextFunction) => {
    const {
        applicableItemIds,
        applicableCategoryIds,
        applicableComboIds,
        applyToAllItems,
        applyToAllCategories,
        applyToAllCombos
    } = req.body

    const isUpdate = req.method === 'PATCH'

    // For UPDATE: Skip validation if no scope fields are provided
    if (isUpdate) {
        const hasScopeFields = applyToAllItems !== undefined ||
            applyToAllCategories !== undefined ||
            applyToAllCombos !== undefined ||
            applicableItemIds !== undefined ||
            applicableCategoryIds !== undefined ||
            applicableComboIds !== undefined

        if (!hasScopeFields) {
            return next()
        }
    }

    // Determine if has item/category scope (flag OR array)
    const hasItemScope = applyToAllItems ||
        applyToAllCategories ||
        (applicableItemIds && applicableItemIds.length > 0) ||
        (applicableCategoryIds && applicableCategoryIds.length > 0)

    const hasComboScope = applyToAllCombos ||
        (applicableComboIds && applicableComboIds.length > 0)

    // Cannot have both item/category scope AND combo scope
    if (hasItemScope && hasComboScope) {
        throw new BadRequestError({
            message: 'Không thể áp dụng khuyến mãi cho cả mặt hàng và combo cùng lúc. Vui lòng chọn một trong hai.'
        })
    }

    // Must have at least one scope (required for CREATE, optional for UPDATE if fields provided)
    if (!hasItemScope && !hasComboScope) {
        throw new BadRequestError({
            message: 'Phải chọn phạm vi áp dụng: mặt hàng/loại mặt hàng hoặc combo'
        })
    }

    next()
}

/**
 * Combined validation middleware for create promotion
 * Includes: schema validation + business rule validations
 * Note: validateDateRange is imported from common.middlewares
 */
export const createPromotionValidation = [
    createPromotionSchema,
    validateDateRange,
    validateGiftPromotion,
    validateCustomerUsageLimit,
    validateProductScope
]
