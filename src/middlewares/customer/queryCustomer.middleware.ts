import { checkSchema } from 'express-validator'
import { validate } from '../validation.middleware'
import { Gender } from '~/enums'

export const customerQueryValidation = validate(
    checkSchema(
        {
            search: {
                optional: true,
                trim: true,
                in: ['query']
            },
            groupId: {
                optional: true,
                isInt: {
                    errorMessage: 'ID nhóm phải là số nguyên'
                },
                toInt: true,
                in: ['query']
            },
            isActive: {
                optional: true,
                isBoolean: {
                    errorMessage: 'Trạng thái phải là boolean'
                },
                toBoolean: true,
                in: ['query']
            },
            gender: {
                optional: true,
                isIn: {
                    options: [[Gender.MALE, Gender.FEMALE]],
                    errorMessage: `Giới tính phải là '${Gender.MALE}' hoặc '${Gender.FEMALE}'`
                },
                in: ['query']
            },
            city: {
                optional: true,
                trim: true,
                in: ['query']
            },
            page: {
                optional: true,
                isInt: {
                    options: { min: 1 },
                    errorMessage: 'Trang phải là số nguyên dương'
                },
                toInt: true,
                in: ['query']
            },
            limit: {
                optional: true,
                isInt: {
                    options: { min: 1, max: 100 },
                    errorMessage: 'Limit phải từ 1 đến 100'
                },
                toInt: true,
                in: ['query']
            }
        },
        ['query']
    )
)
