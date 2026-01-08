import { Router } from 'express'
import { roleController } from '~/controllers/role.controller'
import { dtoValidation } from '~/middlewares/dtoValidation.middleware'
import { accessTokenValidation, requirePermission } from '~/middlewares/auth.middleware'
import { wrapRequestHandler } from '~/utils/handler'
import { CreateRoleDto, UpdateRoleDto } from '~/dtos/role'

const roleRouter = Router()

// All routes require authentication
roleRouter.use(accessTokenValidation)

/**
 * @route   GET /api/roles
 * @desc    Get all roles
 * @access  Private - requires system_users:view
 */
roleRouter.get(
  '/',
  requirePermission('system_users:view'),
  wrapRequestHandler(roleController.getAllRoles)
)

/**
 * @route   GET /api/roles/permissions
 * @desc    Get all available permissions
 * @access  Private - requires system_users:view
 */
roleRouter.get(
  '/permissions',
  requirePermission('system_users:view'),
  wrapRequestHandler(roleController.getAllPermissions)
)

/**
 * @route   GET /api/roles/:id
 * @desc    Get role by ID
 * @access  Private - requires system_users:view
 */
roleRouter.get(
  '/:id',
  requirePermission('system_users:view'),
  wrapRequestHandler(roleController.getRoleById)
)

/**
 * @route   POST /api/roles
 * @desc    Create a new role
 * @access  Private - requires system_users:create
 */
roleRouter.post(
  '/',
  requirePermission('system_users:create'),
  dtoValidation(CreateRoleDto),
  wrapRequestHandler(roleController.createRole)
)

/**
 * @route   PATCH /api/roles/:id
 * @desc    Update role by ID
 * @access  Private - requires system_users:update
 */
roleRouter.patch(
  '/:id',
  requirePermission('system_users:update'),
  dtoValidation(UpdateRoleDto, true),
  wrapRequestHandler(roleController.updateRole)
)

/**
 * @route   DELETE /api/roles/:id
 * @desc    Delete role by ID
 * @access  Private - requires system_users:delete
 */
roleRouter.delete(
  '/:id',
  requirePermission('system_users:delete'),
  wrapRequestHandler(roleController.deleteRole)
)

export default roleRouter
