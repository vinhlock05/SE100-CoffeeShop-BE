import { Router } from 'express'
import { timekeepingController } from '~/controllers/timekeeping.controller'
import { CheckInDto, CheckOutDto, BulkTimekeepingDto, UpdateTimekeepingDto, CreateTimekeepingDto } from '~/dtos/timekeeping'
import { dtoValidation } from '~/middlewares/dtoValidation.middleware'
import { wrapRequestHandler } from '~/utils/handler'
import { accessTokenValidation, requirePermission } from '~/middlewares/auth.middleware'
import { checkIPMiddleware } from '~/middlewares/ip.middleware'

const timekeepingRouter = Router()

timekeepingRouter.use(accessTokenValidation)

/**
 * @route   POST /api/timekeeping/check-in
 * @desc    Chấm công vào (Yêu cầu Check IP)
 * @access  Private (Authenticated staff)
 */
timekeepingRouter.post(
  '/check-in',
  checkIPMiddleware,
  dtoValidation(CheckInDto),
  wrapRequestHandler(timekeepingController.checkIn)
)

/**
 * @route   POST /api/timekeeping/check-out
 * @desc    Chấm công ra (Yêu cầu Check IP)
 * @access  Private (Authenticated staff)
 */
timekeepingRouter.post(
  '/check-out',
  checkIPMiddleware,
  dtoValidation(CheckOutDto),
  wrapRequestHandler(timekeepingController.checkOut)
)

/**
 * @route   POST /api/timekeeping/bulk
 * @desc    Chấm công hàng loạt (Admin)
 * @access  Private (staff_timekeeping:update)
 */
timekeepingRouter.post(
  '/bulk',
  requirePermission('staff_timekeeping:update'),
  dtoValidation(BulkTimekeepingDto),
  wrapRequestHandler(timekeepingController.bulkCheckIn)
)

/**
 * @route   POST /api/timekeeping
 * @desc    Tạo chấm công thủ công (Admin)
 * @access  Private (staff_timekeeping:update)
 */
timekeepingRouter.post(
    '/',
    requirePermission('staff_timekeeping:update'),
    dtoValidation(CreateTimekeepingDto),
    wrapRequestHandler(timekeepingController.create)
)

/**
 * @route   GET /api/timekeeping
 * @desc    Lấy tất cả chấm công (Admin view)
 * @access  Private (staff_timekeeping:view)
 */
timekeepingRouter.get(
  '/',
  requirePermission('staff_timekeeping:view'),
  wrapRequestHandler(timekeepingController.getAll)
)

/**
 * @route   PATCH /api/timekeeping/:id
 * @desc    Cập nhật chấm công (Admin điều chỉnh)
 * @access  Private (staff_timekeeping:update)
 */
timekeepingRouter.patch(
  '/:id',
  requirePermission('staff_timekeeping:update'),
  dtoValidation(UpdateTimekeepingDto),
  wrapRequestHandler(timekeepingController.update)
)

export default timekeepingRouter

