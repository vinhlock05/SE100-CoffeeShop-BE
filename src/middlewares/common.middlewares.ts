import { BadRequestError } from "~/core/error.response"
import { NextFunction, ParamsDictionary } from 'express-serve-static-core'
import { Request, Response } from 'express'
import { isValidNumber, toNumberWithDefaultValue } from "~/utils"
import { isEmpty } from "lodash"

export const checkIdParamMiddleware = (req: Request<ParamsDictionary, any, any>, res: Response, next: NextFunction) => {
    if (req.params?.id && !isValidNumber(req.params?.id)) {
        throw new BadRequestError({ message: 'Id invalid!' })
    } else next()
}

export const checkParamMiddleware = (paramName: string) => {
    return (req: Request<ParamsDictionary, any, any>, res: Response, next: NextFunction) => {
        if (req.params?.[paramName] && !isValidNumber(req.params[paramName])) {
            throw new BadRequestError({ message: `${paramName} invalid!` })
        }
        next()
    }
}

export const checkQueryMiddleware = ({
    requiredFields,
    numbericFields = ['limit', 'page'],
    booleanFields,
    defaultLimit = 20,
    defaultPage = 1,
    maxLimit = 50
}: {
    requiredFields?: string[]
    numbericFields?: string[]
    booleanFields?: string[]
    defaultLimit?: number
    defaultPage?: number
    maxLimit?: number
} = {}) => {
    return (req: Request, res: Response, next: NextFunction) => {
        // Kiểm tra xem có query nào không nằm trong fields không
        if (requiredFields) {
            const invalidFields = requiredFields.filter((field) => !req.query[field])

            if (invalidFields.length > 0) {
                throw new BadRequestError({ message: `${requiredFields.join(', ')} is required on query!` })
            }
        }

        // check is number field
        if (numbericFields) {
            numbericFields.forEach((field) => {
                if (req.query[field] && !isValidNumber(req.query[field] as string)) {
                    throw new BadRequestError({ message: `${field} must be a numberic string` })
                }
            })
        }

        // parse boolean fields
        if (booleanFields) {
            req.parseQueryBoolean = {}

            booleanFields.forEach((field) => {
                const val = req.query[field]

                if (val === 'true') req.parseQueryBoolean![field] = true
                else if (val === 'false') req.parseQueryBoolean![field] = false
                else if (val !== undefined)
                    throw new BadRequestError({
                        message: `${field} must be 'true' or 'false'`
                    })
            })
        }

        //parse limit, page
        req.parseQueryPagination = {
            limit: toNumberWithDefaultValue(req.query.limit, defaultLimit),
            page: toNumberWithDefaultValue(req.query.page, defaultPage)
        }

        if ((req.parseQueryPagination.page as number) <= 0) throw new BadRequestError({ message: 'Page invalid!' })
        if ((req.parseQueryPagination.limit as number) <= 0) throw new BadRequestError({ message: 'Limit invalid!' })

        //check max limit & max page
        if ((req.parseQueryPagination.limit as number) > maxLimit) req.parseQueryPagination.limit = defaultLimit
        next()
    }
}

export const isRequired = (fieldName: string) => ({
    notEmpty: {
        errorMessage: `${fieldName} là bắt buộc`
    }
})

export const isPhone = () => ({
    matches: {
        options: /^[0-9]{10}$/,
        errorMessage: 'Số điện thoại phải có 10 chữ số'
    }
})

/**
 * Convert string to boolean for query params
 * Accepts: 'true', '1', 'yes' as true
 * Accepts: 'false', '0', 'no' as false
 */
export const stringToBoolean = (value: any): boolean | undefined => {
    if (value === undefined || value === null || value === '') return undefined
    if (typeof value === 'boolean') return value

    const str = String(value).toLowerCase().trim()
    if (['true', '1', 'yes'].includes(str)) return true
    if (['false', '0', 'no'].includes(str)) return false

    return undefined
}

export const isEmail = {
    trim: true,
    isEmail: {
        errorMessage: 'Invalid email format'
    },
    normalizeEmail: true
}

export const isLength = ({ fieldName, min = 6, max = 30 }: { fieldName: string; min?: number; max?: number }) => ({
    isLength: {
        options: {
            min,
            max
        },
        errorMessage: `${fieldName} length must be between ${min} and ${max}`
    }
})

export const isString = (fieldName: string) => {
    return {
        isString: {
            errorMessage: `${fieldName} must be a string!`
        }
    }
}

/**
 * Validate date range
 * Ensures endDateTime is after startDateTime
 * Generic middleware that can be used for any entity with date ranges
 */
export const validateDateRange = (req: Request, res: Response, next: NextFunction) => {
    const { startDateTime, endDateTime } = req.body

    if (startDateTime && endDateTime) {
        const start = new Date(startDateTime)
        const end = new Date(endDateTime)

        if (end <= start) {
            throw new BadRequestError({
                message: 'Ngày kết thúc phải sau ngày bắt đầu'
            })
        }
    }

    next()
}

export const isEnum = <Enum extends Record<string, string | number>>(enumObj: Enum, fieldName = 'Value') => ({
    custom: {
        options: (value: any) => {
            const enumValues = Object.values(enumObj)
            if (!enumValues.includes(value)) {
                throw new Error(`${fieldName} must be one of: ${enumValues.join(', ')}`)
            }
            return true
        }
    }
})

//pagination
//parse sort
export const parseSort = ({ allowSortList }: { allowSortList: string[] }) => {
    return (req: Request, res: Response, next: NextFunction) => {
        //convert sort to sort statement in typeorm
        // sort like sort =-id,+name

        const sort = req.query.sort as string | null

        const orderStatement: Record<string, 'ASC' | 'DESC'> = {}
        if (sort && !isEmpty(sort)) {
            const sortFields = sort.split(',')
            sortFields.forEach((sortField) => {
                const orderSort = sortField[0],
                    fieldSort = sortField.substring(1)
                if (fieldSort && orderSort && allowSortList.includes(fieldSort)) {
                    // Ensure the sort order is either ASC or DESC
                    orderStatement[fieldSort] = orderSort === '-' ? 'DESC' : 'ASC'
                }
            })
            req.sortParsed = orderStatement
        }
        next()
    }
}

export function requireJsonContent(req: Request, res: Response, next: NextFunction) {
    if (!req.is('application/json')) {
        throw new BadRequestError({ message: 'Content-Type phải là application/json' })
    }
    next()
}
