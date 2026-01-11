import { checkSchema } from 'express-validator'
import { validate } from '../validation.middleware'
import { isPhone } from '../common.middlewares'
import { Gender } from '~/enums'
import { prisma } from '~/config/database'
import { BadRequestError } from '~/core'

export const updateCustomerValidation = validate(
    checkSchema(
        {
            name: {
                optional: true,
                trim: true,
                isLength: {
                    options: { min: 1, max: 100 },
                    errorMessage: 'Tên khách hàng không được vượt quá 100 ký tự'
                }
            },
            phone: {
                optional: true,
                trim: true,
                ...isPhone(),
                custom: {
                    options: async (value, { req }) => {
                        const customerId = req.params?.id
                        const existing = await prisma.customer.findFirst({
                            where: {
                                phone: value,
                                deletedAt: null,
                                id: { not: Number(customerId) }
                            }
                        })
                        if (existing) {
                            throw new BadRequestError({ message: 'Số điện thoại đã được sử dụng' })
                        }
                        return true
                    }
                }
            },
            gender: {
                optional: true,
                isIn: {
                    options: [[Gender.MALE, Gender.FEMALE]],
                    errorMessage: `Giới tính phải là '${Gender.MALE}' hoặc '${Gender.FEMALE}'`
                }
            },
            birthday: {
                optional: true,
                isISO8601: {
                    errorMessage: 'Ngày sinh phải là định dạng ISO 8601 (YYYY-MM-DD)'
                }
            },
            address: {
                optional: true,
                trim: true,
                isLength: {
                    options: { max: 200 },
                    errorMessage: 'Địa chỉ không được vượt quá 200 ký tự'
                }
            },
            city: {
                optional: true,
                trim: true,
                isLength: {
                    options: { max: 50 },
                    errorMessage: 'Thành phố không được vượt quá 50 ký tự'
                }
            },
            groupId: {
                optional: true,
                isInt: {
                    errorMessage: 'ID nhóm khách hàng phải là số nguyên'
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
