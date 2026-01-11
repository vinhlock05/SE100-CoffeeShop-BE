import { Request, Response, NextFunction } from 'express'
import { body, validationResult, ValidationChain } from 'express-validator'
import { AuthRequestError, BadRequestError } from '~/core/error.response'

export const validate = (validate: ValidationChain[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            // 1. chạy tất cả validation (array các rule)
            await Promise.all(validate.map((validation) => validation.run(req)))

            // 2. lấy kết quả validate
            const errors = validationResult(req)
            if (!errors.isEmpty()) {
                // 3. gom tất cả message lỗi thành mảng
                const errorMessages = errors.array().map((error) => error.msg)

                // 4. lấy ra lỗi đầu tiên
                const firstError = errors.array({ onlyFirstError: true })[0]

                // 5. Nếu lỗi đến từ header (ví dụ thiếu Authorization) → ném ra AuthRequestError
                if ('location' in firstError && firstError.location === 'headers') {
                    return next(new AuthRequestError(errorMessages[0]))
                }

                // 6. Các lỗi khác (body, query, param) → ném ra BadRequestError
                next(
                    new BadRequestError({
                        message: errorMessages[0]
                    })
                )
                return
            }
            next()
        } catch (error) {
            next(error)
        }
    }
}
