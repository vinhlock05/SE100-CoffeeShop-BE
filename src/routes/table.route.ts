import { Router } from 'express'
import { tableController } from '~/controllers/table.controller'
import { dtoValidation } from '~/middlewares/dtoValidation.middleware'
import { accessTokenValidation, requirePermission } from '~/middlewares/auth.middleware'
import { wrapRequestHandler } from '~/utils/handler'
import { CreateTableDto, UpdateTableDto } from '~/dtos/table'

import { checkIdParamMiddleware, checkQueryMiddleware, parseSort } from '~/middlewares/common.middlewares'

const tableRouter = Router()

// All routes require authentication
tableRouter.use(accessTokenValidation)

/**
 * @description : Get all tables
 * @method : GET
 * @path : /api/tables
 * @header : Authorization
 * @query : {q: string, areaId: number, isActive: boolean, limit: number, page: number, sort: string}
 * search for [tableName]
 * sort like -id,+tableName, sort for ['id', 'tableName', 'capacity', 'createdAt', 'updatedAt']
 * filter field must be in [
 *    areaId?: number (filter by area ID),
 *    isActive?: boolean (true: active tables, false: inactive tables)
 * ]
 * @access : Private - requires tables:view
 */
tableRouter.get(
    '/',
    requirePermission('tables:view'),
    checkQueryMiddleware({
        booleanFields: ['isActive'],
        numbericFields: ['areaId', 'limit', 'page']
    }),
    wrapRequestHandler(parseSort({ allowSortList: ['id', 'tableName', 'capacity', 'createdAt', 'updatedAt'] })),
    wrapRequestHandler(tableController.getAllTables)
)

/**
 * @description : Get table by ID
 * @method : GET
 * @path : /api/tables/:id
 * @header : Authorization
 * @params : id
 * @access : Private - requires tables:view
 */
tableRouter.get(
    '/:id',
    checkIdParamMiddleware,
    requirePermission('tables:view'),
    wrapRequestHandler(tableController.getTableById)
)

/**
 * @description : Create a new table
 * @method : POST
 * @path : /api/tables
 * @header : Authorization
 * @body : {
 *    tableName: string,
 *    areaId?: number,
 *    capacity?: number,
 *    isActive?: boolean,
 *    currentStatus?: string
 * }
 * @access : Private - requires tables:create
 */
tableRouter.post(
    '/',
    requirePermission('tables:create'),
    dtoValidation(CreateTableDto),
    wrapRequestHandler(tableController.createTable)
)

/**
 * @description : Update table by ID
 * @method : PATCH
 * @path : /api/tables/:id
 * @header : Authorization
 * @params : id
 * @body : {
 *    tableName?: string,
 *    areaId?: number,
 *    capacity?: number,
 *    isActive?: boolean,
 *    currentStatus?: string
 * }
 * @access : Private - requires tables:update
 */
tableRouter.patch(
    '/:id',
    checkIdParamMiddleware,
    requirePermission('tables:update'),
    dtoValidation(UpdateTableDto, true),
    wrapRequestHandler(tableController.updateTable)
)

/**
 * @description : Delete table by ID
 * @method : DELETE
 * @path : /api/tables/:id
 * @header : Authorization
 * @params : id
 * @access : Private - requires tables:delete
 */
tableRouter.delete(
    '/:id',
    checkIdParamMiddleware,
    requirePermission('tables:delete'),
    wrapRequestHandler(tableController.deleteTable)
)

export default tableRouter
