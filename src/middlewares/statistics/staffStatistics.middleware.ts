import { checkSchema } from 'express-validator'
import { validate } from '../validation.middleware'
import { isRequired } from '../common.middlewares'

export const staffStatisticsValidation = validate(
    checkSchema(
        {
            displayType: {
                ...isRequired('Dạng hiển thị'),
                isIn: {
                    options: [['report', 'chart']],
                    errorMessage: 'Dạng hiển thị phải là report hoặc chart'
                }
            },
            concern: {
                ...isRequired('Mối quan tâm'),
                isIn: {
                    options: [['profit', 'sales']],
                    errorMessage: 'Mối quan tâm phải là profit hoặc sales'
                }
            },
            startDate: {
                ...isRequired('Ngày bắt đầu'),
                isISO8601: {
                    errorMessage: 'Ngày bắt đầu phải là định dạng ISO 8601 (YYYY-MM-DD)'
                }
            },
            endDate: {
                ...isRequired('Ngày kết thúc'),
                isISO8601: {
                    errorMessage: 'Ngày kết thúc phải là định dạng ISO 8601 (YYYY-MM-DD)'
                },
                custom: {
                    options: (value, { req }) => {
                        const startDate = new Date((req.query?.startDate as string) || '')
                        const endDate = new Date(value)
                        if (endDate < startDate) {
                            throw new Error('Ngày kết thúc phải sau hoặc bằng ngày bắt đầu')
                        }
                        return true
                    }
                }
            }
        },
        ['query']
    )
)
