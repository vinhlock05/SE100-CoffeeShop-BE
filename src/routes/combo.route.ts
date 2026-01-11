import { Router } from 'express'
import { comboController } from '~/controllers/combo.controller'
import { dtoValidation } from '~/middlewares/dtoValidation.middleware'
import { accessTokenValidation, requirePermission } from '~/middlewares/auth.middleware'
import { wrapRequestHandler } from '~/utils/handler'
import { CreateComboDto, UpdateComboDto } from '~/dtos/combo'

const comboRouter = Router()

// All routes require authentication
comboRouter.use(accessTokenValidation)

/**
 * @route   GET /api/combos/active
 * @desc    Get active combos for POS (no permission required for staff)
 * @access  Authenticated
 */
comboRouter.get(
  '/active',
  wrapRequestHandler(comboController.getActive)
)

/**
 * @route   GET /api/combos
 * @desc    Get all combos with filters
 * @access  combos:view
 */
comboRouter.get(
  '/',
  requirePermission('combos:view'),
  wrapRequestHandler(comboController.getAll)
)

/**
 * @route   GET /api/combos/:id
 * @desc    Get combo by ID
 * @access  combos:view
 */
comboRouter.get(
  '/:id',
  requirePermission('combos:view'),
  wrapRequestHandler(comboController.getById)
)

/**
 * @route   POST /api/combos
 * @desc    Create new combo
 * @access  combos:create
 */
comboRouter.post(
  '/',
  requirePermission('combos:create'),
  dtoValidation(CreateComboDto),
  wrapRequestHandler(comboController.create)
)

/**
 * @route   PATCH /api/combos/:id
 * @desc    Update combo
 * @access  combos:update
 */
comboRouter.patch(
  '/:id',
  requirePermission('combos:update'),
  dtoValidation(UpdateComboDto),
  wrapRequestHandler(comboController.update)
)

/**
 * @route   PATCH /api/combos/:id/toggle-active
 * @desc    Toggle combo active status
 * @access  combos:update
 */
comboRouter.patch(
  '/:id/toggle-active',
  requirePermission('combos:update'),
  wrapRequestHandler(comboController.toggleActive)
)

/**
 * @route   DELETE /api/combos/:id
 * @desc    Delete combo (soft delete)
 * @access  combos:delete
 */
comboRouter.delete(
  '/:id',
  requirePermission('combos:delete'),
  wrapRequestHandler(comboController.delete)
)

export default comboRouter
