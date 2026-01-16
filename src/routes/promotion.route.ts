import { Router } from 'express'
import { promotionController } from '~/controllers/promotion.controller'
import { accessTokenValidation, requirePermission } from '~/middlewares/auth.middleware'
import { checkIdParamMiddleware, checkQueryMiddleware, parseSort } from '~/middlewares/common.middlewares'
import { wrapRequestHandler } from '~/utils/handler'
import { createPromotionValidation } from '~/middlewares/promotion/createPromotion.middleware'
import { updatePromotionValidation } from '~/middlewares/promotion/updatePromotion.middleware'
import { applyPromotionValidation } from '~/middlewares/promotion/applyPromotion.middleware'

const promotionRouter = Router()

// All routes require authentication
promotionRouter.use(accessTokenValidation)

/**
 * @description : Get all promotions with pagination
 * @method : GET
 * @path : /api/promotions
 * @header : Authorization
 * @query : {search: string, typeId: number, isActive: boolean, limit: number, page: number, sort: string}
 * search for [name, code, description]
 * sort like -id,+name, sort for ['id', 'code', 'name', 'createdAt']
 * @access : Private - requires promotions:view
 * @example : /api/promotions?isActive=true (get active only)
 */
promotionRouter.get(
    '/',
    requirePermission('promotions:view'),
    checkQueryMiddleware({
        booleanFields: ['isActive'],
        numbericFields: ['limit', 'page', 'typeId']
    }),
    wrapRequestHandler(parseSort({ allowSortList: ['id', 'code', 'name', 'createdAt'] })),
    wrapRequestHandler(promotionController.getAll)
)

/**
 * @description : Get promotion by ID with statistics
 * @method : GET
 * @path : /api/promotions/:id
 * @header : Authorization
 * @params : id
 * @access : Private - requires promotions:view
 * @returns : Promotion details + statistics (totalUsages, uniqueCustomers, remainingUsages)
 */
promotionRouter.get(
    '/:id',
    checkIdParamMiddleware,
    requirePermission('promotions:view'),
    wrapRequestHandler(promotionController.getById)
)

/**
 * @description : Check if customer can use promotion
 * @method : GET
 * @path : /api/promotions/:id/check-eligibility
 * @header : Authorization
 * @params : id
 * @query : {customerId: number}
 * @access : Private - requires promotions:view
 */
promotionRouter.get(
    '/:id/check-eligibility',
    checkIdParamMiddleware,
    requirePermission('promotions:view'),
    wrapRequestHandler(promotionController.checkEligibility)
)

/**
 * @description : Get available promotions for an order
 * @method : POST
 * @path : /api/promotions/available
 * @header : Authorization
 * @body : {customerId?: number, orderId: number}
 * @access : Private - requires promotions:view
 * @returns : List of promotions with canApply status and reason
 */
promotionRouter.post(
    '/available',
    requirePermission('promotions:view'),
    wrapRequestHandler(promotionController.getAvailablePromotions)
)


/**
 * @description : Apply promotion to order
 * @method : POST
 * @path : /api/promotions/apply
 * @header : Authorization
 * @body : ApplyPromotionDto
 * @access : Private - requires promotions:apply
 */
promotionRouter.post(
    '/apply',
    requirePermission('promotions:apply'),
    applyPromotionValidation,
    wrapRequestHandler(promotionController.apply)
)

/**
 * @description : Remove promotion from order
 * @method : POST
 * @path : /api/promotions/unapply
 * @header : Authorization
 * @body : {promotionId: number, orderId: number}
 * @access : Private - requires promotions:apply
 */
promotionRouter.post(
    '/unapply',
    requirePermission('promotions:apply'),
    wrapRequestHandler(promotionController.unapply)
)

/**
 * @description : Create a new promotion
 * @method : POST
 * @path : /api/promotions
 * @header : Authorization
 * @body : CreatePromotionDto
 * @access : Private - requires promotions:create
 */
promotionRouter.post(
    '/',
    requirePermission('promotions:create'),
    ...createPromotionValidation,
    wrapRequestHandler(promotionController.create)
)

/**
 * @description : Update promotion by ID
 * @method : PATCH
 * @path : /api/promotions/:id
 * @header : Authorization
 * @params : id
 * @body : UpdatePromotionDto
 * @access : Private - requires promotions:update
 */
promotionRouter.patch(
    '/:id',
    checkIdParamMiddleware,
    requirePermission('promotions:update'),
    ...updatePromotionValidation,
    wrapRequestHandler(promotionController.update)
)

/**
 * @description : Delete promotion by ID (soft delete)
 * @method : DELETE
 * @path : /api/promotions/:id
 * @header : Authorization
 * @params : id
 * @access : Private - requires promotions:delete
 */
promotionRouter.delete(
    '/:id',
    checkIdParamMiddleware,
    requirePermission('promotions:delete'),
    wrapRequestHandler(promotionController.delete)
)

export default promotionRouter
