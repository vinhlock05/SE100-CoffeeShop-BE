import { Router } from 'express'
import { authController } from '~/controllers/auth.controller'
import { dtoValidation } from '~/middlewares/dtoValidation.middleware'
import { accessTokenValidation, refreshTokenValidation } from '~/middlewares/auth.middleware'
import { wrapRequestHandler } from '~/utils/handler'
import { LoginDto } from '~/dtos/auth'

const authRouter = Router()

/**
 * @route   POST /api/auth/login
 * @desc    Login with username and password
 * @access  Public
 */
authRouter.post(
  '/login',
  dtoValidation(LoginDto),
  wrapRequestHandler(authController.login)
)

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Refresh access token using refresh token
 * @access  Public (requires valid refresh token)
 */
authRouter.post(
  '/refresh-token',
  refreshTokenValidation,
  wrapRequestHandler(authController.refreshToken)
)

// Protected routes (require access token)
authRouter.use(accessTokenValidation)

/**
 * @route   POST /api/auth/logout
 * @desc    Logout and invalidate tokens
 * @access  Private
 */
authRouter.post(
  '/logout',
  wrapRequestHandler(authController.logout)
)

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
authRouter.get(
  '/me',
  wrapRequestHandler(authController.me)
)

/**
 * @route   POST /api/auth/change-username
 * @desc    Change username
 * @access  Private
 */
authRouter.post(
  '/change-username',
  wrapRequestHandler(authController.changeUsername)
)

/**
 * @route   POST /api/auth/change-password
 * @desc    Change password
 * @access  Private
 */
authRouter.post(
  '/change-password',
  wrapRequestHandler(authController.changePassword)
)

export default authRouter
