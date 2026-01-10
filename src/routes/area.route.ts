import { Router } from 'express'
import { areaController } from '~/controllers/area.controller'
import { dtoValidation } from '~/middlewares/dtoValidation.middleware'
import { accessTokenValidation, requirePermission } from '~/middlewares/auth.middleware'
import { wrapRequestHandler } from '~/utils/handler'
import { CreateAreaDto, UpdateAreaDto } from '~/dtos/area'

import { checkIdParamMiddleware, checkQueryMiddleware, parseSort } from '~/middlewares/common.middlewares'

const areaRouter = Router()

// All routes require authentication
areaRouter.use(accessTokenValidation)

/**
 * @description : Get all areas
 * @method : GET
 * @path : /api/areas
 * @header : Authorization
 * @query : {limit: number, page: number, sort: string}
 * sort like -id,+name, sort field: 'id', 'name', 'createdAt', 'updatedAt'
 * @access : Private - requires tables:view
 */
areaRouter.get(
    '/',
    requirePermission('tables:view'),
    checkQueryMiddleware(),
    wrapRequestHandler(parseSort({ allowSortList: ['id', 'name', 'createdAt', 'updatedAt'] })),
    wrapRequestHandler(areaController.getAllAreas)
)

/**
 * @description : Get area by ID
 * @method : GET
 * @path : /api/areas/:id
 * @header : Authorization
 * @params : id
 * @access : Private - requires tables:view
 */
areaRouter.get(
    '/:id',
    checkIdParamMiddleware,
    requirePermission('tables:view'),
    wrapRequestHandler(areaController.getAreaById)
)

/**
 * @description : Create a new area
 * @method : POST
 * @path : /api/areas
 * @header : Authorization
 * @body : {
 *    name: string
 * }
 * @access : Private - requires tables:create
 */
areaRouter.post(
    '/',
    requirePermission('tables:create'),
    dtoValidation(CreateAreaDto),
    wrapRequestHandler(areaController.createArea)
)

/**
 * @description : Update area by ID
 * @method : PATCH
 * @path : /api/areas/:id
 * @header : Authorization
 * @params : id
 * @body : {
 *    name: string
 * }
 * @access : Private - requires tables:update
 */
areaRouter.patch(
    '/:id',
    checkIdParamMiddleware,
    requirePermission('tables:update'),
    dtoValidation(UpdateAreaDto, true),
    wrapRequestHandler(areaController.updateArea)
)

/**
 * @description : Delete area by ID
 * @method : DELETE
 * @path : /api/areas/:id
 * @header : Authorization
 * @params : id
 * @access : Private - requires tables:delete
 */
areaRouter.delete(
    '/:id',
    checkIdParamMiddleware,
    requirePermission('tables:delete'),
    wrapRequestHandler(areaController.deleteArea)
)

export default areaRouter
