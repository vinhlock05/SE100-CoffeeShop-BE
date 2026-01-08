import { Request, Response } from 'express'
import { authService } from '~/services/auth.service'
import { SuccessResponse } from '~/core/success.response'

const isProd = process.env.NODE_ENV === 'production'

const cookieOpts = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'none' : 'lax' as 'none' | 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
}

class AuthController {
  /**
   * POST /api/auth/login
   * Login with username and password
   */
  login = async (req: Request, res: Response) => {
    const { username, password } = req.body
    const result = await authService.login(username, password)

    // Set refresh token in cookie
    res.cookie('refreshToken', result.refreshToken, cookieOpts)

    return new SuccessResponse({
      message: 'Login successfully',
      metaData: {
        user: result.user,
        accessToken: result.accessToken
      }
    }).send(res)
  }

  /**
   * POST /api/auth/logout
   * Logout and clear cookies
   */
  logout = async (req: Request, res: Response) => {
    const result = await authService.logout()

    // Clear refresh token cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict'
    })

    return new SuccessResponse({
      message: result.message
    }).send(res)
  }

  /**
   * POST /api/auth/refresh-token
   * Refresh access token using refresh token
   */
  refreshToken = async (req: Request, res: Response) => {
    const userId = req.decodedToken!.userId
    const result = await authService.refreshToken(userId)

    // Update refresh token cookie
    res.cookie('refreshToken', result.refreshToken, cookieOpts)

    return new SuccessResponse({
      message: 'Token refreshed successfully',
      metaData: {
        accessToken: result.accessToken
      }
    }).send(res)
  }

  /**
   * GET /api/auth/me
   * Get current user profile
   */
  me = async (req: Request, res: Response) => {
    const userId = req.user!.id
    const result = await authService.me(userId)

    return new SuccessResponse({
      message: 'Get profile successfully',
      metaData: result
    }).send(res)
  }

  /**
   * POST /api/auth/change-username
   * Change username
   */
  changeUsername = async (req: Request, res: Response) => {
    const userId = req.user!.id
    const { username } = req.body
    
    if (!username) throw new Error('Username is required')

    const result = await authService.changeUsername(userId, username)

    return new SuccessResponse({
      message: 'Change username successfully',
      metaData: result
    }).send(res)
  }

  /**
   * POST /api/auth/change-password
   * Change password
   */
  changePassword = async (req: Request, res: Response) => {
    const userId = req.user!.id
    const { currentPassword, newPassword } = req.body
    
    if (!currentPassword || !newPassword) throw new Error('Current password and new password are required')

    const result = await authService.changePassword(userId, currentPassword, newPassword)

    return new SuccessResponse({
      message: result.message
    }).send(res)
  }
}

export const authController = new AuthController()
