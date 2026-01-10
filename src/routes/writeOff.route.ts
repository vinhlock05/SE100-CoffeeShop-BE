import { Router } from 'express'
import { writeOffController } from '~/controllers/writeOff.controller'
import { dtoValidation } from '~/middlewares/dtoValidation.middleware'
import { accessTokenValidation, requirePermission } from '~/middlewares/auth.middleware'
import { wrapRequestHandler } from '~/utils/handler'
import { CreateWriteOffDto, UpdateWriteOffDto } from '~/dtos/writeOff'

const writeOffRouter = Router()

// Yêu cầu xác thực cho tất cả routes
writeOffRouter.use(accessTokenValidation)

/**
 * @route   POST /api/write-offs
 * @desc    Tạo phiếu xuất huỷ mới
 *          - Tự động sinh mã (XH001, XH002, ...)
 *          - Validate số lượng tồn kho trước khi tạo
 * @access  Private - Yêu cầu quyền write_offs:create
 * @body    { writeOffDate?, reason?, notes?, items[] }
 */
writeOffRouter.post(
  '/',
  requirePermission('write_offs:create'),
  dtoValidation(CreateWriteOffDto),
  wrapRequestHandler(writeOffController.create)
)

/**
 * @route   GET /api/write-offs
 * @desc    Lấy danh sách phiếu xuất huỷ với filter và phân trang
 * @access  Private - Yêu cầu quyền write_offs:view
 * @query   search, status, fromDate, toDate, sortBy, sortOrder, page, limit
 */
writeOffRouter.get(
  '/',
  requirePermission('write_offs:view'),
  wrapRequestHandler(writeOffController.getAll)
)

/**
 * @route   GET /api/write-offs/:id
 * @desc    Lấy chi tiết phiếu xuất huỷ theo ID
 * @access  Private - Yêu cầu quyền write_offs:view
 * @params  id: ID phiếu xuất huỷ
 */
writeOffRouter.get(
  '/:id',
  requirePermission('write_offs:view'),
  wrapRequestHandler(writeOffController.getById)
)

/**
 * @route   PATCH /api/write-offs/:id
 * @desc    Cập nhật phiếu xuất huỷ (chỉ phiếu tạm)
 * @access  Private - Yêu cầu quyền write_offs:create
 * @params  id: ID phiếu xuất huỷ
 * @body    { writeOffDate?, reason?, notes?, items[]? }
 */
writeOffRouter.patch(
  '/:id',
  requirePermission('write_offs:create'),
  dtoValidation(UpdateWriteOffDto),
  wrapRequestHandler(writeOffController.update)
)

/**
 * @route   PATCH /api/write-offs/:id/complete
 * @desc    Hoàn thành phiếu xuất huỷ và trừ tồn kho
 * @access  Private - Yêu cầu quyền write_offs:create
 * @params  id: ID phiếu xuất huỷ
 */
writeOffRouter.patch(
  '/:id/complete',
  requirePermission('write_offs:create'),
  wrapRequestHandler(writeOffController.complete)
)

/**
 * @route   PATCH /api/write-offs/:id/cancel
 * @desc    Huỷ phiếu xuất huỷ (chỉ phiếu chưa hoàn thành)
 * @access  Private - Yêu cầu quyền write_offs:create
 * @params  id: ID phiếu xuất huỷ
 */
writeOffRouter.patch(
  '/:id/cancel',
  requirePermission('write_offs:create'),
  wrapRequestHandler(writeOffController.cancel)
)

export default writeOffRouter
