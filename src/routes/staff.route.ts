import { Router } from 'express'
import { staffController } from '~/controllers/staff.controller'
import { dtoValidation } from '~/middlewares/dtoValidation.middleware'
import { accessTokenValidation, requirePermission } from '~/middlewares/auth.middleware'
import { wrapRequestHandler } from '~/utils/handler'
import { CreateStaffDto, UpdateStaffDto } from '~/dtos/staff'

const staffRouter = Router()

// Protected routes
staffRouter.use(accessTokenValidation)

/**
 * @route   POST /api/staff
 * @desc    Create new staff
 * @access  Private (hr:create)
 */
staffRouter.post(
  '/',
  // requirePermission('hr:create'), // Uncomment when permission is ready
  dtoValidation(CreateStaffDto),
  wrapRequestHandler(staffController.createStaff)
)

/**
 * @route   GET /api/staff
 * @desc    Get all staff
 * @access  Private (hr:view)
 */
staffRouter.get(
  '/',
  // requirePermission('hr:view'),
  wrapRequestHandler(staffController.getAllStaff)
)

/**
 * @route   GET /api/staff/:id
 * @desc    Get staff detail
 * @access  Private (hr:view)
 */
staffRouter.get(
  '/:id',
  // requirePermission('hr:view'),
  wrapRequestHandler(staffController.getStaffById)
)

/**
 * @route   PATCH /api/staff/:id
 * @desc    Update staff
 * @access  Private (hr:update)
 */
staffRouter.patch(
  '/:id',
  // requirePermission('hr:update'),
  dtoValidation(UpdateStaffDto),
  wrapRequestHandler(staffController.updateStaff)
)

/**
 * @route   DELETE /api/staff/:id
 * @desc    Delete staff
 * @access  Private (hr:delete)
 */
staffRouter.delete(
  '/:id',
  // requirePermission('hr:delete'),
  wrapRequestHandler(staffController.deleteStaff)
)

export default staffRouter
