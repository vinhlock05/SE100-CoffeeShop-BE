import { Router } from 'express'
import { stockCheckController } from '~/controllers/stockCheck.controller'
import { dtoValidation } from '~/middlewares/dtoValidation.middleware'
import { accessTokenValidation, requirePermission } from '~/middlewares/auth.middleware'
import { wrapRequestHandler } from '~/utils/handler'
import { CreateStockCheckDto, UpdateStockCheckDto } from '~/dtos/stockCheck'

const stockCheckRouter = Router()

// Yêu cầu xác thực cho tất cả routes
stockCheckRouter.use(accessTokenValidation)

/**
 * @route   POST /api/stock-checks
 * @desc    Tạo phiên kiểm kê mới
 *          - Tự động sinh mã (KK001, KK002, ...)
 *          - Tự động lấy systemQuantity từ currentStock
 *          - Tính difference = actualQuantity - systemQuantity
 * @access  Private - Yêu cầu quyền goods_stock_check:create
 * @body    { checkDate?, notes?, items[] }
 */
stockCheckRouter.post(
  '/',
  requirePermission('goods_stock_check:create'),
  dtoValidation(CreateStockCheckDto),
  wrapRequestHandler(stockCheckController.create)
)

/**
 * @route   GET /api/stock-checks
 * @desc    Lấy danh sách phiên kiểm kê với filter và phân trang
 * @access  Private - Yêu cầu quyền goods_stock_check:view
 * @query   search, status, fromDate, toDate, sortBy, sortOrder, page, limit
 */
stockCheckRouter.get(
  '/',
  requirePermission('goods_stock_check:view'),
  wrapRequestHandler(stockCheckController.getAll)
)

/**
 * @route   GET /api/stock-checks/:id
 * @desc    Lấy chi tiết phiên kiểm kê theo ID
 * @access  Private - Yêu cầu quyền goods_stock_check:view
 * @params  id: ID phiên kiểm kê
 */
stockCheckRouter.get(
  '/:id',
  requirePermission('goods_stock_check:view'),
  wrapRequestHandler(stockCheckController.getById)
)

/**
 * @route   PATCH /api/stock-checks/:id
 * @desc    Cập nhật phiên kiểm kê (chỉ phiên đang tiến hành)
 * @access  Private - Yêu cầu quyền goods_stock_check:create
 * @params  id: ID phiên kiểm kê
 * @body    { checkDate?, notes?, items[]? }
 */
stockCheckRouter.patch(
  '/:id',
  requirePermission('goods_stock_check:create'),
  dtoValidation(UpdateStockCheckDto),
  wrapRequestHandler(stockCheckController.update)
)

/**
 * @route   PATCH /api/stock-checks/:id/complete
 * @desc    Hoàn thành phiên kiểm kê và cập nhật tồn kho theo thực tế
 * @access  Private - Yêu cầu quyền goods_stock_check:create
 * @params  id: ID phiên kiểm kê
 */
stockCheckRouter.patch(
  '/:id/complete',
  requirePermission('goods_stock_check:create'),
  wrapRequestHandler(stockCheckController.complete)
)

/**
 * @route   PATCH /api/stock-checks/:id/cancel
 * @desc    Huỷ phiên kiểm kê (chỉ phiên chưa hoàn thành)
 * @access  Private - Yêu cầu quyền goods_stock_check:create
 * @params  id: ID phiên kiểm kê
 */
stockCheckRouter.patch(
  '/:id/cancel',
  requirePermission('goods_stock_check:create'),
  wrapRequestHandler(stockCheckController.cancel)
)

export default stockCheckRouter
