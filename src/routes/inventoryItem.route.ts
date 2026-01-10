import { Router } from 'express'
import { inventoryItemController } from '~/controllers/inventoryItem.controller'
import { dtoValidation } from '~/middlewares/dtoValidation.middleware'
import { accessTokenValidation, requirePermission } from '~/middlewares/auth.middleware'
import { wrapRequestHandler } from '~/utils/handler'
import { CreateItemDto, UpdateItemDto } from '~/dtos/inventoryItem'

const inventoryItemRouter = Router()

// Yêu cầu xác thực cho tất cả routes
inventoryItemRouter.use(accessTokenValidation)

/**
 * @route   POST /api/inventory-items
 * @desc    Tạo sản phẩm/nguyên liệu mới
 *          - Tự động sinh mã SKU
 * @access  Private - Yêu cầu quyền goods_inventory:create
 * @body    { name, categoryId, itemTypeId, unitId, minStock?, maxStock?, sellingPrice?, saleStatus? }
 */
inventoryItemRouter.post(
  '/',
  requirePermission('goods_inventory:create'),
  dtoValidation(CreateItemDto),
  wrapRequestHandler(inventoryItemController.createItem)
)

/**
 * @route   PATCH /api/inventory-items/prices
 * @desc    Cập nhật giá hàng loạt
 * @access  Private - Yêu cầu quyền goods_pricing:update
 * @note    Route này phải định nghĩa trước /:id để tránh xung đột
 */
inventoryItemRouter.patch(
  '/prices',
  requirePermission('goods_pricing:update'),
  wrapRequestHandler(inventoryItemController.updatePrices)
)

/**
 * @route   GET /api/inventory-items
 * @desc    Lấy danh sách sản phẩm/nguyên liệu với filter và phân trang
 * @access  Private - Yêu cầu quyền goods_inventory:view
 * @query   search, categoryId, itemTypeId, status, saleStatus, sortBy, sortOrder, page, limit
 */
inventoryItemRouter.get(
  '/',
  requirePermission('goods_inventory:view'),
  wrapRequestHandler(inventoryItemController.getAllItems)
)

/**
 * @route   GET /api/inventory-items/:id
 * @desc    Lấy chi tiết sản phẩm/nguyên liệu theo ID
 *          - Bao gồm thông tin category, unit, batches
 * @access  Private - Yêu cầu quyền goods_inventory:view
 * @params  id: ID sản phẩm
 */
inventoryItemRouter.get(
  '/:id',
  requirePermission('goods_inventory:view'),
  wrapRequestHandler(inventoryItemController.getItemById)
)

/**
 * @route   PATCH /api/inventory-items/:id
 * @desc    Cập nhật thông tin sản phẩm/nguyên liệu
 * @access  Private - Yêu cầu quyền goods_inventory:update
 * @params  id: ID sản phẩm
 * @body    { name?, categoryId?, unitId?, minStock?, maxStock?, sellingPrice?, saleStatus? }
 */
inventoryItemRouter.patch(
  '/:id',
  requirePermission('goods_inventory:update'),
  dtoValidation(UpdateItemDto),
  wrapRequestHandler(inventoryItemController.updateItem)
)

/**
 * @route   DELETE /api/inventory-items/:id
 * @desc    Xóa sản phẩm/nguyên liệu (soft delete)
 *          - Chỉ xóa được sản phẩm chưa có giao dịch
 * @access  Private - Yêu cầu quyền goods_inventory:delete
 * @params  id: ID sản phẩm
 */
inventoryItemRouter.delete(
  '/:id',
  requirePermission('goods_inventory:delete'),
  wrapRequestHandler(inventoryItemController.deleteItem)
)

export default inventoryItemRouter
