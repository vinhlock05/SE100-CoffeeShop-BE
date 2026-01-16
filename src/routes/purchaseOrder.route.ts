import { Router } from 'express'
import { purchaseOrderController } from '~/controllers/purchaseOrder.controller'
import { dtoValidation } from '~/middlewares/dtoValidation.middleware'
import { accessTokenValidation, requirePermission } from '~/middlewares/auth.middleware'
import { parseSort } from '~/middlewares/common.middlewares'
import { wrapRequestHandler } from '~/utils/handler'
import { CreatePurchaseOrderDto, UpdatePurchaseOrderDto } from '~/dtos/purchaseOrder'

const purchaseOrderRouter = Router()

// Yêu cầu xác thực cho tất cả routes
purchaseOrderRouter.use(accessTokenValidation)

/**
 * @route   POST /api/purchase-orders
 * @desc    Tạo phiếu nhập hàng mới
 *          - Tự động tính tổng tiền từ danh sách items
 *          - Status mặc định: draft (phiếu tạm)
 * @access  Private - Yêu cầu quyền purchase_orders:create
 * @body    { supplierId, orderDate?, paidAmount?, paymentMethod?, bankName?, bankAccount?, notes?, items[] }
 */
purchaseOrderRouter.post(
  '/',
  requirePermission('purchase_orders:create'),
  dtoValidation(CreatePurchaseOrderDto),
  wrapRequestHandler(purchaseOrderController.create)
)

/**
 * @route   GET /api/purchase-orders
 * @desc    Lấy danh sách phiếu nhập hàng với filter và phân trang
 *          - Response bao gồm items chi tiết để FE expand xem
 * @access  Private - Yêu cầu quyền purchase_orders:view
 * @query   search, status, paymentStatus, supplierId, fromDate, toDate, sort, page, limit
 */
purchaseOrderRouter.get(
  '/',
  requirePermission('purchase_orders:view'),
  wrapRequestHandler(parseSort({ allowSortList: ['orderDate', 'totalAmount', 'code'] })),
  wrapRequestHandler(purchaseOrderController.getAll)
)

/**
 * @route   GET /api/purchase-orders/:id
 * @desc    Lấy chi tiết phiếu nhập hàng theo ID
 * @access  Private - Yêu cầu quyền purchase_orders:view
 * @params  id: ID phiếu nhập hàng
 */
purchaseOrderRouter.get(
  '/:id',
  requirePermission('purchase_orders:view'),
  wrapRequestHandler(purchaseOrderController.getById)
)

/**
 * @route   PATCH /api/purchase-orders/:id
 * @desc    Cập nhật phiếu nhập hàng (chỉ phiếu tạm)
 *          - Có thể thay đổi toàn bộ thông tin bao gồm cả items
 * @access  Private - Yêu cầu quyền purchase_orders:update
 * @params  id: ID phiếu nhập hàng
 * @body    { supplierId?, orderDate?, paidAmount?, paymentMethod?, bankName?, bankAccount?, notes?, items[]? }
 */
purchaseOrderRouter.patch(
  '/:id',
  requirePermission('purchase_orders:update'),
  dtoValidation(UpdatePurchaseOrderDto),
  wrapRequestHandler(purchaseOrderController.update)
)

/**
 * @route   PATCH /api/purchase-orders/:id/complete
 * @desc    Hoàn thành phiếu nhập hàng và cập nhật tồn kho
 *          - Tạo InventoryBatch cho từng item
 *          - Cập nhật currentStock, totalValue, avgUnitCost của InventoryItem
 *          - Cập nhật totalPurchases, totalDebt của Supplier
 * @access  Private - Yêu cầu quyền purchase_orders:update
 * @params  id: ID phiếu nhập hàng
 */
purchaseOrderRouter.patch(
  '/:id/complete',
  requirePermission('purchase_orders:update'),
  wrapRequestHandler(purchaseOrderController.complete)
)

/**
 * @route   PATCH /api/purchase-orders/:id/cancel
 * @desc    Huỷ phiếu nhập hàng (chỉ phiếu chưa hoàn thành)
 * @access  Private - Yêu cầu quyền purchase_orders:update
 * @params  id: ID phiếu nhập hàng
 */
purchaseOrderRouter.patch(
  '/:id/cancel',
  requirePermission('purchase_orders:update'),
  wrapRequestHandler(purchaseOrderController.cancel)
)

export default purchaseOrderRouter
