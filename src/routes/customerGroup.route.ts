import { Router } from 'express'
import { customerGroupController } from '~/controllers/customerGroup.controller'
import { accessTokenValidation, requirePermission } from '~/middlewares/auth.middleware'
import { checkIdParamMiddleware, checkQueryMiddleware, parseSort } from '~/middlewares/common.middlewares'
import { wrapRequestHandler } from '~/utils/handler'
import { createCustomerGroupValidation } from '~/middlewares/customerGroup/createCustomerGroup.middleware'
import { updateCustomerGroupValidation } from '~/middlewares/customerGroup/updateCustomerGroup.middleware'

const customerGroupRouter = Router()

customerGroupRouter.use(accessTokenValidation)

/**
 * @description : Get all customer groups
 * @method : GET
 * @path : /api/customer-groups
 * @header : Authorization
 * @query : {search: string, sort: string}
 * search for [name, description]
 * sort like -id,+name, sort for ['id', 'code', 'name', 'priority', 'minSpend', 'minOrders', 'windowMonths']
 * @access : Private - requires customers:view
 */
customerGroupRouter.get(
    '/',
    requirePermission('customers:view'),
    checkQueryMiddleware(),
    wrapRequestHandler(parseSort({ allowSortList: ['id', 'code', 'name', 'priority', 'minSpend', 'minOrders', 'windowMonths'] })),
    wrapRequestHandler(customerGroupController.getAll)
)

/**
 * @description : Get customer group by ID
 * @method : GET
 * @path : /api/customer-groups/:id
 * @header : Authorization
 * @params : id
 * @access : Private - requires customers:view
 */
customerGroupRouter.get(
    '/:id',
    checkIdParamMiddleware,
    requirePermission('customers:view'),
    wrapRequestHandler(customerGroupController.getById)
)

/**
 * @description : Create a new customer group
 * @method : POST
 * @path : /api/customer-groups
 * @header : Authorization
 * @body : {
 *    name: string (required, unique),
 *    description?: string,
 *    priority: number (default: 0),
 *    minSpend?: number (default: 0),
 *    minOrders?: number (default: 0),
 *    windowMonths?: number (default: 12)
 * }
 * @access : Private - requires customers:create
 */
customerGroupRouter.post(
    '/',
    requirePermission('customers:create'),
    createCustomerGroupValidation,
    wrapRequestHandler(customerGroupController.create)
)

/**
 * @description : Update customer group by ID
 * @method : PATCH
 * @path : /api/customer-groups/:id
 * @header : Authorization
 * @params : id
 * @body : {
 *    name?: string (unique),
 *    description?: string,
 *    priority?: number,
 *    minSpend?: number,
 *    minOrders?: number,
 *    windowMonths?: number
 * }
 * @access : Private - requires customers:update
 */
customerGroupRouter.patch(
    '/:id',
    checkIdParamMiddleware,
    requirePermission('customers:update'),
    updateCustomerGroupValidation,
    wrapRequestHandler(customerGroupController.update)
)

/**
 * @description : Delete customer group by ID (soft delete)
 * @method : DELETE
 * @path : /api/customer-groups/:id
 * @header : Authorization
 * @params : id
 * @access : Private - requires customers:delete
 */
customerGroupRouter.delete(
    '/:id',
    checkIdParamMiddleware,
    requirePermission('customers:delete'),
    wrapRequestHandler(customerGroupController.delete)
)

export default customerGroupRouter
