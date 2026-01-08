import { Router } from 'express'
import { userController } from '~/controllers/user.controller'
import { dtoValidation } from '~/middlewares/dtoValidation.middleware'
import { accessTokenValidation, requirePermission } from '~/middlewares/auth.middleware'
import { wrapRequestHandler } from '~/utils/handler'
import { CreateUserDto, UpdateUserDto } from '~/dtos/user'

const userRouter = Router()

// All routes require authentication
userRouter.use(accessTokenValidation)

/**
 * @route   GET /api/users
 * @desc    Get all users with pagination
 * @access  Private - requires system_users:view
 */
userRouter.get(
  '/',
  requirePermission('system_users:view'),
  wrapRequestHandler(userController.getAllUsers)
)

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Private - requires system_users:view
 */
userRouter.get(
  '/:id',
  requirePermission('system_users:view'),
  wrapRequestHandler(userController.getUserById)
)

/**
 * @route   POST /api/users
 * @desc    Create a new user
 * @access  Private - requires system_users:create
 */
userRouter.post(
  '/',
  requirePermission('system_users:create'),
  dtoValidation(CreateUserDto),
  wrapRequestHandler(userController.createUser)
)

/**
 * @route   PATCH /api/users/:id
 * @desc    Update user by ID
 * @access  Private - requires system_users:update
 */
userRouter.patch(
  '/:id',
  requirePermission('system_users:update'),
  dtoValidation(UpdateUserDto, true), // skipMissingProperties = true for partial update
  wrapRequestHandler(userController.updateUser)
)

/**
 * @route   DELETE /api/users/:id
 * @desc    Soft delete user by ID
 * @access  Private - requires system_users:delete
 */
userRouter.delete(
  '/:id',
  requirePermission('system_users:delete'),
  wrapRequestHandler(userController.deleteUser)
)

/**
 * @route   POST /api/users/:id/restore
 * @desc    Restore deleted user
 * @access  Private - requires system_users:delete
 */
userRouter.post(
  '/:id/restore',
  requirePermission('system_users:delete'),
  wrapRequestHandler(userController.restoreUser)
)

export default userRouter
