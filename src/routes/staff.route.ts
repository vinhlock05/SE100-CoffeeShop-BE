import { Router } from 'express'
import { staffController } from '~/controllers/staff.controller'
import { dtoValidation } from '~/middlewares/dtoValidation.middleware'
import { accessTokenValidation, requirePermission } from '~/middlewares/auth.middleware'
import { wrapRequestHandler } from '~/utils/handler'
import { CreateStaffDto, UpdateStaffDto } from '~/dtos/staff'
import { parseSort } from '~/middlewares/common.middlewares'

const staffRouter = Router()

// Yêu cầu xác thực cho tất cả routes
staffRouter.use(accessTokenValidation)

/**
 * @route   POST /api/staff
 * @desc    Tạo nhân viên mới
 *          - Tự động sinh mã NV (NV001, NV002, ...)
 *          - Tự động tạo tài khoản User liên kết nếu có thông tin đăng nhập
 * @access  Private - Yêu cầu quyền staff:create
 * @body    { fullName, phone, email?, position?, salaryType?, baseSalary?, username?, password?, roleId? }
 */
staffRouter.post(
  '/',
  requirePermission('staff:create'),
  dtoValidation(CreateStaffDto),
  wrapRequestHandler(staffController.createStaff)
)

/**
 * @route   GET /api/staff
 * @desc    Lấy danh sách nhân viên với filter và phân trang
 * @access  Private - Yêu cầu quyền staff:view
 * @query   search, status, position, sort, page, limit
 */
staffRouter.get(
  '/',
  requirePermission('staff:view'),
  wrapRequestHandler(parseSort({ allowSortList: ['code', 'name', 'createdAt'] })),
  wrapRequestHandler(staffController.getAllStaff)
)

/**
 * @route   GET /api/staff/:id
 * @desc    Lấy chi tiết nhân viên theo ID
 *          - Bao gồm thông tin tài khoản User và Role
 * @access  Private - Yêu cầu quyền staff:view
 * @params  id: ID nhân viên
 */
staffRouter.get(
  '/:id',
  requirePermission('staff:view'),
  wrapRequestHandler(staffController.getStaffById)
)

/**
 * @route   PATCH /api/staff/:id
 * @desc    Cập nhật thông tin nhân viên
 *          - Có thể cập nhật cả thông tin tài khoản User
 * @access  Private - Yêu cầu quyền staff:update
 * @params  id: ID nhân viên
 * @body    { fullName?, phone?, email?, position?, salaryType?, baseSalary?, status?, username?, password?, roleId? }
 */
staffRouter.patch(
  '/:id',
  requirePermission('staff:update'),
  dtoValidation(UpdateStaffDto),
  wrapRequestHandler(staffController.updateStaff)
)

/**
 * @route   DELETE /api/staff/:id
 * @desc    Xóa nhân viên (soft delete)
 *          - Cũng vô hiệu hóa tài khoản User liên kết
 * @access  Private - Yêu cầu quyền staff:delete
 * @params  id: ID nhân viên
 */
staffRouter.delete(
  '/:id',
  requirePermission('staff:delete'),
  wrapRequestHandler(staffController.deleteStaff)
)

export default staffRouter
