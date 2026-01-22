import { checkSchema } from 'express-validator'
import { validate } from '~/middlewares/validation.middleware'

export const supplierStatisticsValidation = validate(
    checkSchema(
        {
            displayType: {
                in: ['query'],
                isString: true,
                custom: {
                    options: (value) => ['report', 'chart'].includes(value)
                },
                errorMessage: 'Display type must be report or chart'
            },
            concern: {
                in: ['query'],
                isString: true,
                custom: {
                    options: (value) => ['purchasing', 'debt'].includes(value)
                },
                errorMessage: 'Concern must be purchasing or debt'
            },
            startDate: {
                in: ['query'],
                isISO8601: true,
                errorMessage: 'Start date must be ISO8601 format'
            },
            endDate: {
                in: ['query'],
                isISO8601: true,
                errorMessage: 'End date must be ISO8601 format'
            },
            search: {
                in: ['query'],
                optional: true,
                isString: true
            }
        },
        ['query']
    )
)
