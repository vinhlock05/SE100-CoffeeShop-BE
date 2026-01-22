import { checkSchema } from 'express-validator'
import { validate } from '../validation.middleware'
import { isRequired } from '../common.middlewares'

export const endOfDayStatisticsValidation = validate(
    checkSchema(
        {
            concern: {
                ...isRequired('Mối quan tâm'),
                isIn: {
                    options: [['sales', 'revenue_expenses', 'inventory', 'cancelled_items']],
                    errorMessage: 'Mối quan tâm phải là sales, revenue_expenses, inventory hoặc cancelled_items'
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
            // Sales concern filters
            customerSearch: {
                optional: true,
                trim: true,
                isString: {
                    errorMessage: 'Tìm kiếm khách hàng phải là chuỗi'
                }
            },
            staffIds: {
                optional: true,
                isArray: {
                    errorMessage: 'Danh sách ID nhân viên phải là mảng'
                }
            },
            'staffIds.*': {
                optional: true,
                isInt: {
                    errorMessage: 'Mỗi ID nhân viên phải là số nguyên'
                },
                toInt: true
            },
            paymentMethods: {
                optional: true,
                isArray: {
                    errorMessage: 'Danh sách phương thức thanh toán phải là mảng'
                }
            },
            'paymentMethods.*': {
                optional: true,
                isString: {
                    errorMessage: 'Mỗi phương thức thanh toán phải là chuỗi'
                }
            },
            // Revenue/Expenses concern filters
            categoryIds: {
                optional: true,
                isArray: {
                    errorMessage: 'Danh sách ID loại thu chi phải là mảng'
                }
            },
            'categoryIds.*': {
                optional: true,
                isInt: {
                    errorMessage: 'Mỗi ID loại thu chi phải là số nguyên'
                },
                toInt: true
            },
            // Inventory concern filters
            productSearch: {
                optional: true,
                trim: true,
                isString: {
                    errorMessage: 'Tìm kiếm sản phẩm phải là chuỗi'
                }
            }
        },
        ['body']
    )
)
