import { Router } from 'express'
import { orderController } from '~/controllers/order.controller'
import { dtoValidation } from '~/middlewares/dtoValidation.middleware'
import { accessTokenValidation, requirePermission, requireAnyPermission } from '~/middlewares/auth.middleware'
import { parseSort } from '~/middlewares/common.middlewares'
import { wrapRequestHandler } from '~/utils/handler'
import { 
  CreateOrderDto, 
  UpdateOrderDto, 
  AddOrderItemDto, 
  UpdateOrderItemDto,
  ReduceItemDto,
  UpdateItemStatusDto,
  CheckoutDto,
  TransferTableDto,
  MergeOrdersDto,
  SplitOrderDto,
  ReportOutOfStockDto
} from '~/dtos/order'

const orderRouter = Router()

// All routes require authentication
orderRouter.use(accessTokenValidation)

// ========================================
// KITCHEN ROUTES
// ========================================

/**
 * @route   GET /api/orders/kitchen/items
 * @desc    Get items for kitchen display
 */
orderRouter.get(
  '/kitchen/items',
  requirePermission('kitchen:access'),
  wrapRequestHandler(orderController.getKitchenItems)
)

/**
 * @route   GET /api/orders/kitchen/items/:itemId/recipe
 * @desc    Get recipe for an item
 */
orderRouter.get(
  '/kitchen/items/:itemId/recipe',
  requirePermission('kitchen:access'),
  wrapRequestHandler(orderController.getItemRecipe)
)

/**
 * @route   POST /api/orders/kitchen/items/:itemId/out-of-stock
 * @desc    Report item out of stock
 */
orderRouter.post(
  '/kitchen/items/:itemId/out-of-stock',
  requirePermission('kitchen:access'),
  dtoValidation(ReportOutOfStockDto),
  wrapRequestHandler(orderController.reportOutOfStock)
)

/**
 * @route   PATCH /api/orders/items/status
 * @desc    Batch update item status (kitchen + serve)
 */
orderRouter.patch(
  '/items/:itemId/status',
  requireAnyPermission(['kitchen:access', 'pos:access']),
  dtoValidation(UpdateItemStatusDto),
  wrapRequestHandler(orderController.updateItemStatus)
)

// ========================================
// POS ROUTES - Require pos:access permission
// ========================================

/**
 * @route   GET /api/orders/table/:tableId
 * @desc    Get current order by table
 */
orderRouter.get(
  '/table/:tableId',
  requirePermission('pos:access'),
  wrapRequestHandler(orderController.getByTable)
)

/**
 * @route   GET /api/orders/history/table/:tableId
 * @desc    Get order history for a table
 */
orderRouter.get(
  '/history/table/:tableId',
  requirePermission('pos:access'),
  wrapRequestHandler(orderController.getTableHistory)
)

/**
 * @route   POST /api/orders
 * @desc    Create new order
 */
orderRouter.post(
  '/',
  requirePermission('pos:access'),
  dtoValidation(CreateOrderDto),
  wrapRequestHandler(orderController.create)
)

/**
 * @route   GET /api/orders
 * @desc    Get all orders with filters
 */
orderRouter.get(
  '/',
  requirePermission('pos:access'),
  wrapRequestHandler(parseSort({ allowSortList: ['orderCode', 'totalAmount', 'createdAt'] })),
  wrapRequestHandler(orderController.getAll)
)

/**
 * @route   GET /api/orders/:id
 * @desc    Get order by ID
 */
orderRouter.get(
  '/:id',
  requirePermission('pos:access'),
  wrapRequestHandler(orderController.getById)
)

/**
 * @route   PATCH /api/orders/:id
 * @desc    Update order
 */
orderRouter.patch(
  '/:id',
  requirePermission('pos:access'),
  dtoValidation(UpdateOrderDto),
  wrapRequestHandler(orderController.update)
)

/**
 * @route   POST /api/orders/:id/items
 * @desc    Add item to order
 */
orderRouter.post(
  '/:id/items',
  requirePermission('pos:access'),
  dtoValidation(AddOrderItemDto),
  wrapRequestHandler(orderController.addItem)
)

/**
 * @route   PATCH /api/orders/:id/items/:itemId
 * @desc    Update item (quantity, notes, customization, status)
 */
orderRouter.patch(
  '/:id/items/:itemId',
  dtoValidation(UpdateOrderItemDto),
  wrapRequestHandler(orderController.updateOrderItem)
)

/**
 * @route   DELETE /api/orders/:id/items/:itemId
 * @desc    Reduce/cancel item with reason
 */
orderRouter.delete(
  '/:id/items/:itemId',
  requirePermission('pos:access'),
  dtoValidation(ReduceItemDto),
  wrapRequestHandler(orderController.reduceItem)
)

/**
 * @route   POST /api/orders/:id/send-to-kitchen
 * @desc    Send order to kitchen
 */
orderRouter.post(
  '/:id/send-to-kitchen',
  requirePermission('pos:access'),
  wrapRequestHandler(orderController.sendToKitchen)
)

/**
 * @route   POST /api/orders/:id/checkout
 * @desc    Checkout order
 */
orderRouter.post(
  '/:id/checkout',
  requirePermission('pos:access'),
  dtoValidation(CheckoutDto),
  wrapRequestHandler(orderController.checkout)
)

/**
 * @route   POST /api/orders/:id/cancel
 * @desc    Cancel order
 */
orderRouter.post(
  '/:id/cancel',
  requirePermission('pos:access'),
  wrapRequestHandler(orderController.cancel)
)

// ========================================
// TABLE OPERATIONS
// ========================================

/**
 * @route   POST /api/orders/:id/transfer
 * @desc    Transfer order to new table
 */
orderRouter.post(
  '/:id/transfer',
  requirePermission('pos:access'),
  dtoValidation(TransferTableDto),
  wrapRequestHandler(orderController.transferTable)
)

/**
 * @route   POST /api/orders/:id/merge
 * @desc    Merge another order into this one
 */
orderRouter.post(
  '/:id/merge',
  requirePermission('pos:access'),
  dtoValidation(MergeOrdersDto),
  wrapRequestHandler(orderController.mergeOrders)
)

/**
 * @route   POST /api/orders/:id/split
 * @desc    Split order to new table
 */
orderRouter.post(
  '/:id/split',
  requirePermission('pos:access'),
  dtoValidation(SplitOrderDto),
  wrapRequestHandler(orderController.splitOrder)
)

export default orderRouter
