import { checkSchema } from 'express-validator'
import { validate } from '../validation.middleware'
import { isRequired } from '../common.middlewares'
import { prisma } from '~/config/database'

export const createCustomerGroupValidation = validate(
    checkSchema(
        {
            name: {
                trim: true,
                ...isRequired('Tên nhóm khách hàng'),
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
                ...isRequired('Độ ưu tiên'),
                isInt: {
                    options: { min: 0 },
                    errorMessage: 'Độ ưu tiên phải là số nguyên không âm'
                },
                toInt: true,
                custom: {
                    options: async (value) => {
                        const existing = await prisma.customerGroup.findFirst({
                            where: {
                                priority: Number(value),
                                deletedAt: null
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
