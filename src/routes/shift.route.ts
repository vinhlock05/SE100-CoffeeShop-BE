import { Router } from 'express'
import { shiftController } from '~/controllers/shift.controller'
import { CreateShiftDto, UpdateShiftDto } from '~/dtos/shift'
import { accessTokenValidation } from '~/middlewares/auth.middleware'
import { dtoValidation } from '~/middlewares/dtoValidation.middleware'
import { wrapRequestHandler } from '~/utils/handler'

const shiftRouter = Router()

shiftRouter.use(accessTokenValidation)

/**
 * @route   POST /api/shifts
 * @desc    Tạo ca làm việc mới
 * @access  Private (staff_settings:update)
 */
shiftRouter.post(
  '/',
  // requirePermission('staff_settings:update'),
  dtoValidation(CreateShiftDto),
  wrapRequestHandler(shiftController.createShift)
)

/**
 * @route   GET /api/shifts
 * @desc    Lấy danh sách ca làm việc
 * @access  Private (staff_scheduling:view)
 */
shiftRouter.get(
  '/',
  // requirePermission('staff_scheduling:view'),
  wrapRequestHandler(shiftController.getAllShifts)
)

/**
 * @route   GET /api/shifts/:id
 * @desc    Lấy chi tiết ca làm việc
 * @access  Private
 */
shiftRouter.get(
  '/:id',
  wrapRequestHandler(shiftController.getShiftById)
)

/**
 * @route   PATCH /api/shifts/:id
 * @desc    Cập nhật thông tin ca làm việc
 * @access  Private (staff_settings:update)
 */
shiftRouter.patch(
  '/:id',
  // requirePermission('staff_settings:update'),
  dtoValidation(UpdateShiftDto),
  wrapRequestHandler(shiftController.updateShift)
)

/**
 * @route   DELETE /api/shifts/:id
 * @desc    Xóa ca làm việc
 * @access  Private (staff_settings:update)
 */
shiftRouter.delete(
  '/:id',
  // requirePermission('staff_settings:update'),
  wrapRequestHandler(shiftController.deleteShift)
)

/**
 * @route   PATCH /api/shifts/:id/toggle
 * @desc    Bật/tắt trạng thái ca
 * @access  Private (staff_settings:update)
 */
shiftRouter.patch(
  '/:id/toggle',
  // requirePermission('staff_settings:update'),
  wrapRequestHandler(shiftController.toggleActive)
)

export default shiftRouter
