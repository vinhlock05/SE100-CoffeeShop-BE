import { checkSchema } from 'express-validator'
import { validate } from '../validation.middleware'
import { prisma } from '~/config/database'

export const updateCustomerGroupValidation = validate(
    checkSchema(
        {
            name: {
                optional: true,
                trim: true,
                isLength: {
                    options: { min: 1, max: 100 },
                    errorMessage: 'Tên nhóm không được vượt quá 100 ký tự'
                }
            },
            description: {
                optional: true,
                trim: true,
                isLength: {
                    options: { max: 500 },
                    errorMessage: 'Mô tả không được vượt quá 500 ký tự'
                }
            },
            priority: {
                optional: true,
                isInt: {
                    options: { min: 0 },
                    errorMessage: 'Độ ưu tiên phải là số nguyên không âm'
                },
                toInt: true,
                custom: {
                    options: async (value, { req }) => {
                        const groupId = req.params?.id
                        const existing = await prisma.customerGroup.findFirst({
                            where: {
                                priority: Number(value),
                                deletedAt: null,
                                id: { not: Number(groupId) }
                            }
                        })
                        if (existing) {
                            throw new Error('Độ ưu tiên đã được sử dụng bởi nhóm khác')
                        }
                        return true
                    }
                }
            },
            minSpend: {
                optional: true,
                isFloat: {
                    options: { min: 0 },
                    errorMessage: 'Số tiền tối thiểu phải là số không âm'
                },
                toFloat: true
            },
            minOrders: {
                optional: true,
                isInt: {
                    options: { min: 0 },
                    errorMessage: 'Số đơn hàng tối thiểu phải là số nguyên không âm'
                },
                toInt: true
            },
            windowMonths: {
                optional: true,
                isInt: {
                    options: { min: 1, max: 60 },
                    errorMessage: 'Số tháng tính toán phải từ 1 đến 60'
                },
                toInt: true
            }
        },
        ['body']
    )
)
