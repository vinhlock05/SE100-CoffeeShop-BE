
import { Router } from 'express'
import { scheduleController } from '~/controllers/schedule.controller'
import { CreateScheduleDto, BulkCreateScheduleDto, SwapScheduleDto } from '~/dtos/schedule'
import { dtoValidation } from '~/middlewares/dtoValidation.middleware'
import { wrapRequestHandler } from '~/utils/handler'
import { accessTokenValidation, requirePermission } from '~/middlewares/auth.middleware'

const scheduleRouter = Router()

// Apply Global Auth
scheduleRouter.use(accessTokenValidation)

/**
 * @route   POST /api/schedules
 * @desc    Tạo 1 lịch làm việc
 * @access  Private (staff_scheduling:update)
 */
scheduleRouter.post(
  '/',
  requirePermission('staff_scheduling:update'),
  dtoValidation(CreateScheduleDto),
  wrapRequestHandler(scheduleController.createOne)
)

/**
 * @route   POST /api/schedules/bulk
 * @desc    Tạo nhiều lịch làm việc
 * @access  Private (staff_scheduling:update)
 */
scheduleRouter.post(
  '/bulk',
  requirePermission('staff_scheduling:update'),
  dtoValidation(BulkCreateScheduleDto),
  wrapRequestHandler(scheduleController.createBulk)
)

/**
 * @route   POST /api/schedules/swap
 * @desc    Đổi ca giữa 2 nhân viên
 * @access  Private (staff_scheduling:update)
 */
scheduleRouter.post(
  '/swap',
  requirePermission('staff_scheduling:update'),
  dtoValidation(SwapScheduleDto),
  wrapRequestHandler(scheduleController.swap)
)

/**
 * @route   GET /api/schedules
 * @desc    Lấy danh sách lịch
 * @query   from, to, staffId, shiftId
 * @access  Private (staff_scheduling:view)
 */
scheduleRouter.get(
  '/',
  requirePermission('staff_scheduling:view'),
  wrapRequestHandler(scheduleController.getAll)
)

/**
 * @route   DELETE /api/schedules/:id
 * @desc    Xóa lịch làm việc
 * @access  Private (staff_scheduling:update)
 */
scheduleRouter.delete(
  '/:id',
  requirePermission('staff_scheduling:update'),
  wrapRequestHandler(scheduleController.delete)
)

export default scheduleRouter

