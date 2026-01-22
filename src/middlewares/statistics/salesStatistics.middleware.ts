import { checkSchema } from 'express-validator'
import { validate } from '../validation.middleware'
import { isRequired } from '../common.middlewares'

export const salesStatisticsValidation = validate(
    checkSchema(
        {
            concern: {
                ...isRequired('Mối quan tâm'),
                isIn: {
                    options: [['time', 'profit', 'invoice_discount', 'returns', 'tables', 'categories', 'products', 'customers']],
                    errorMessage:
                        'Mối quan tâm phải là time, profit, invoice_discount, returns, tables, categories, products hoặc customers'
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
                        const startDate = new Date(req.body.startDate)
                        const endDate = new Date(value)
                        if (endDate < startDate) {
                            throw new Error('Ngày kết thúc phải sau hoặc bằng ngày bắt đầu')
                        }
                        return true
                    }
                }
            },
            // Common filters
            areaIds: {
                optional: true,
                isArray: {
                    errorMessage: 'Danh sách ID khu vực phải là mảng'
                }
            },
            'areaIds.*': {
                optional: true,
                isInt: {
                    errorMessage: 'Mỗi ID khu vực phải là số nguyên'
                },
                toInt: true
            },
            tableIds: {
                optional: true,
                isArray: {
                    errorMessage: 'Danh sách ID bàn phải là mảng'
                }
            },
            'tableIds.*': {
                optional: true,
                isInt: {
                    errorMessage: 'Mỗi ID bàn phải là số nguyên'
                },
                toInt: true
            },
            // Display type (for time and profit concerns)
            displayType: {
                optional: true,
                isIn: {
                    options: [['report', 'chart']],
                    errorMessage: 'Dạng hiển thị phải là report hoặc chart'
                }
            }
        },
        ['body']
    )
)
