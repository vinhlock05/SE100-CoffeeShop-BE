import { Request, Response, NextFunction } from 'express'
import { prisma } from '~/config/database'
import { AuthRequestError, ForbiddenRequestError } from '~/core/error.response'
import { verifyToken } from '~/utils/jwt'
import { env } from '~/config/env'
import { TokenType } from '~/enums/tokenType.enum'
import { DecodedToken } from '~/type.d'

/**
 * Middleware to validate access token
 * Uses User model for authentication
 */
export const accessTokenValidation = async (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthRequestError('Access token is required')
    }
    
    const token = authHeader.split(' ')[1]
    
    if (!token) {
      throw new AuthRequestError('Access token is required')
    }
    
    // Verify token
    const decoded = verifyToken(token, env.JWT_ACCESS_SECRET) as DecodedToken
    
    if (decoded.tokenType !== TokenType.ACCESS_TOKEN) {
      throw new AuthRequestError('Invalid token type')
    }
    
    // Find user with role, permissions and staff
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true
              }
            }
          }
        },
        staff: true
      }
    })
    
    if (!user) {
      throw new AuthRequestError('User not found')
    }
    
    if (user.status !== 'active') {
      throw new AuthRequestError('User account is not active')
    }
    
    if (user.deletedAt) {
      throw new AuthRequestError('User account has been deleted')
    }
    
    // Extract permissions from role
    const permissions = user.role.rolePermissions.map(rp => rp.permissionId)
    
    // Attach user info to request (fullName comes from linked Staff)
    req.user = {
      id: user.id,
      username: user.username,
      fullName: user.staff?.fullName,
      roleId: user.roleId,
      status: user.status,
      permissions
    }
    req.decodedToken = decoded
    
    next()
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      next(new AuthRequestError('Access token has expired'))
    } else if (error.name === 'JsonWebTokenError') {
      next(new AuthRequestError('Invalid access token'))
    } else {
      next(error)
    }
  }
}

/**
 * Middleware to validate refresh token from cookie or body
 */
export const refreshTokenValidation = async (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  try {
    // Get refresh token from cookie or body
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken
    
    if (!refreshToken) {
      throw new AuthRequestError('Refresh token is required')
    }
    
    // Verify token
    const decoded = verifyToken(refreshToken, env.JWT_REFRESH_SECRET) as DecodedToken
    
    if (decoded.tokenType !== TokenType.REFRESH_TOKEN) {
      throw new AuthRequestError('Invalid token type')
    }
    
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    })
    
    if (!user || user.deletedAt) {
      throw new AuthRequestError('User not found')
    }
    
    req.decodedToken = decoded
    req.refreshToken = refreshToken
    
    next()
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      next(new AuthRequestError('Refresh token has expired'))
    } else if (error.name === 'JsonWebTokenError') {
      next(new AuthRequestError('Invalid refresh token'))
    } else {
      next(error)
    }
  }
}

/**
 * Middleware factory to check if user has required permission
 */
export const requirePermission = (permissionId: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AuthRequestError('User not authenticated'))
    }
    
    if (!req.user.permissions.includes(permissionId)) {
      return next(new ForbiddenRequestError(`Permission denied: ${permissionId}`))
    }
    
    next()
  }
}

/**
 * Middleware factory to check if user has any of the required permissions
 */
export const requireAnyPermission = (permissionIds: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AuthRequestError('User not authenticated'))
    }
    
    const hasPermission = permissionIds.some(p => req.user!.permissions.includes(p))
    
    if (!hasPermission) {
      return next(new ForbiddenRequestError(`Permission denied: requires one of ${permissionIds.join(', ')}`))
    }
    
    next()
  }
}
