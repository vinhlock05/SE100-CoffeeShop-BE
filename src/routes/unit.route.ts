import { Router } from 'express'
import { unitController } from '~/controllers/unit.controller'
import { dtoValidation } from '~/middlewares/dtoValidation.middleware'
import { accessTokenValidation } from '~/middlewares/auth.middleware'
import { wrapRequestHandler } from '~/utils/handler'
import { CreateUnitDto, UpdateUnitDto } from '~/dtos/unit'

const unitRouter = Router()

// Protected routes
unitRouter.use(accessTokenValidation)

/**
 * @route   POST /api/units
 * @desc    Create new unit
 * @access  Private
 */
unitRouter.post(
  '/',
  dtoValidation(CreateUnitDto),
  wrapRequestHandler(unitController.createUnit)
)

/**
 * @route   GET /api/units
 * @desc    Get all units
 * @access  Private
 */
unitRouter.get(
  '/',
  wrapRequestHandler(unitController.getAllUnits)
)

/**
 * @route   GET /api/units/:id
 * @desc    Get unit by ID
 * @access  Private
 */
unitRouter.get(
  '/:id',
  wrapRequestHandler(unitController.getUnitById)
)

/**
 * @route   PATCH /api/units/:id
 * @desc    Update unit
 * @access  Private
 */
unitRouter.patch(
  '/:id',
  dtoValidation(UpdateUnitDto),
  wrapRequestHandler(unitController.updateUnit)
)

/**
 * @route   DELETE /api/units/:id
 * @desc    Delete unit
 * @access  Private
 */
unitRouter.delete(
  '/:id',
  wrapRequestHandler(unitController.deleteUnit)
)

export default unitRouter
