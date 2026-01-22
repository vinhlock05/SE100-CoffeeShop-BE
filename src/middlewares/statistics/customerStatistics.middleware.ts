import { checkSchema } from 'express-validator'
import { validate } from '~/middlewares/validation.middleware'

export const customerStatisticsValidation = validate(
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
            customerGroupIds: {
                in: ['query'],
                optional: true,
                // Can be a string (comma separated) or array - handled in controller.
                // Just checks it doesn't break basic validation if present
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
