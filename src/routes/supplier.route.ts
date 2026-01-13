import { Router } from 'express'
import { supplierController } from '~/controllers/supplier.controller'
import { dtoValidation } from '~/middlewares/dtoValidation.middleware'
import { accessTokenValidation, requirePermission } from '~/middlewares/auth.middleware'
import { wrapRequestHandler } from '~/utils/handler'
import { CreateSupplierDto, UpdateSupplierDto } from '~/dtos/supplier'

const supplierRouter = Router()

// Yêu cầu xác thực cho tất cả routes
supplierRouter.use(accessTokenValidation)

/**
 * @route   POST /api/suppliers
 * @desc    Tạo nhà cung cấp mới
 *          - Tự động sinh mã NCC (NCC001, NCC002, ...)
 *          - Status mặc định: active
 * @access  Private - Yêu cầu quyền suppliers:create
 * @body    { name, contactPerson?, phone?, email?, address?, city?, category? }
 */
supplierRouter.post(
  '/',
  requirePermission('suppliers:create'),
  dtoValidation(CreateSupplierDto),
  wrapRequestHandler(supplierController.create)
)

/**
 * @route   GET /api/suppliers
 * @desc    Lấy danh sách nhà cung cấp với filter và phân trang
 *          - Response bao gồm purchaseOrders gần nhất để FE expand xem lịch sử nhập
 * @access  Private - Yêu cầu quyền suppliers:view
 * @query   search, status, category, city, sortBy, sortOrder, page, limit
 */
supplierRouter.get(
  '/',
  requirePermission('suppliers:view'),
  wrapRequestHandler(supplierController.getAll)
)


/**
 * @route   GET /api/suppliers/categories
 * @desc    Lấy danh sách các danh mục nhà cung cấp đang có trong hệ thống (distinct)
 *          - Dùng cho dropdown filter
 * @access  Private - Yêu cầu quyền suppliers:view
 */
supplierRouter.get(
  '/categories',
  requirePermission('suppliers:view'),
  wrapRequestHandler(supplierController.getAllCategories)
)

/**
 * @route   GET /api/suppliers/:id
 * @desc    Lấy chi tiết nhà cung cấp theo ID
 * @access  Private - Yêu cầu quyền suppliers:view
 * @params  id: ID nhà cung cấp
 */
supplierRouter.get(
  '/:id',
  requirePermission('suppliers:view'),
  wrapRequestHandler(supplierController.getById)
)

/**
 * @route   PATCH /api/suppliers/:id
 * @desc    Cập nhật thông tin nhà cung cấp
 * @access  Private - Yêu cầu quyền suppliers:update
 * @params  id: ID nhà cung cấp
 * @body    { name?, contactPerson?, phone?, email?, address?, city?, category?, status? }
 */
supplierRouter.patch(
  '/:id',
  requirePermission('suppliers:update'),
  dtoValidation(UpdateSupplierDto),
  wrapRequestHandler(supplierController.update)
)

/**
 * @route   PATCH /api/suppliers/:id/toggle-status
 * @desc    Bật/Tắt trạng thái hoạt động của nhà cung cấp (active <-> inactive)
 * @access  Private - Yêu cầu quyền suppliers:update
 * @params  id: ID nhà cung cấp
 */
supplierRouter.patch(
  '/:id/toggle-status',
  requirePermission('suppliers:update'),
  wrapRequestHandler(supplierController.toggleStatus)
)

/**
 * @route   DELETE /api/suppliers/:id
 * @desc    Xóa nhà cung cấp (soft delete)
 *          - Chỉ xóa được NCC chưa có phiếu nhập hàng
 * @access  Private - Yêu cầu quyền suppliers:delete
 * @params  id: ID nhà cung cấp
 */
supplierRouter.delete(
  '/:id',
  requirePermission('suppliers:delete'),
  wrapRequestHandler(supplierController.delete)
)

export default supplierRouter
