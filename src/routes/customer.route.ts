import { Router } from 'express'
import { customerController } from '~/controllers/customer.controller'
import { accessTokenValidation, requirePermission } from '~/middlewares/auth.middleware'
import { checkIdParamMiddleware, checkQueryMiddleware, parseSort } from '~/middlewares/common.middlewares'
import { wrapRequestHandler } from '~/utils/handler'
import { createCustomerValidation } from '~/middlewares/customer/createCustomer.middleware'
import { updateCustomerValidation } from '~/middlewares/customer/updateCustomer.middleware'

const customerRouter = Router()

// All routes require authentication
customerRouter.use(accessTokenValidation)

/**
 * @description : Get all customers
 * @method : GET
 * @path : /api/customers
 * @header : Authorization
 * @query : {search: string, groupId: number, isActive: boolean, gender: string, city: string, limit: number, page: number, sort: string}
 * search for [name, code, phone]
 * sort like -id,+name, sort for ['id', 'code', 'name', 'totalOrders', 'totalSpent']
 * filter field must be in [
 *    groupId?: number (filter by customer group ID),
 *    isActive?: boolean (true: active customers, false: inactive customers),
 *    gender?: string (filter by gender: 'male' or 'female'),
 *    city?: string (filter by city name)
 * ]
 * @access : Private - requires customers:view
 */
customerRouter.get(
    '/',
    requirePermission('customers:view'),
    checkQueryMiddleware({
        booleanFields: ['isActive']
    }),
    wrapRequestHandler(parseSort({ allowSortList: ['id', 'code', 'name', 'totalOrders', 'totalSpent'] })),
    wrapRequestHandler(customerController.getAll)
)

/**
 * @description : Get customer by ID
 * @method : GET
 * @path : /api/customers/:id
 * @header : Authorization
 * @params : id
 * @access : Private - requires customers:view
 */
customerRouter.get(
    '/:id',
    checkIdParamMiddleware,
    requirePermission('customers:view'),
    wrapRequestHandler(customerController.getById)
)

/**
 * @description : Create a new customer
 * @method : POST
 * @path : /api/customers
 * @header : Authorization
 * @body : {
 *    name: string (required),
 *    phone: string (required, unique),
 *    gender?: string ('male' or 'female', default: 'male'),
 *    birthday?: string (ISO date),
 *    address?: string,
 *    city?: string,
 *    groupId?: number (auto-assigned to default group if not provided),
 *    isActive?: boolean (default: true)
 * }
 * @access : Private - requires customers:create
 */
customerRouter.post(
    '/',
    requirePermission('customers:create'),
    createCustomerValidation,
    wrapRequestHandler(customerController.create)
)

/**
 * @description : Update customer by ID
 * @method : PATCH
 * @path : /api/customers/:id
 * @header : Authorization
 * @params : id
 * @body : {
 *    name?: string,
 *    phone?: string (unique),
 *    gender?: string ('male' or 'female'),
 *    birthday?: string (ISO date),
 *    address?: string,
 *    city?: string,
 *    groupId?: number,
 *    isActive?: boolean
 * }
 * @access : Private - requires customers:update
 */
customerRouter.patch(
    '/:id',
    checkIdParamMiddleware,
    requirePermission('customers:update'),
    updateCustomerValidation,
    wrapRequestHandler(customerController.update)
)

/**
 * @description : Delete customer by ID (soft delete)
 * @method : DELETE
 * @path : /api/customers/:id
 * @header : Authorization
 * @params : id
 * @access : Private - requires customers:delete
 */
customerRouter.delete(
    '/:id',
    checkIdParamMiddleware,
    requirePermission('customers:delete'),
    wrapRequestHandler(customerController.delete)
)

export default customerRouter
