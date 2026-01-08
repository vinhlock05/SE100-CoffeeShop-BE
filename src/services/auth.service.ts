import { prisma } from '~/config/database'
import { BadRequestError, AuthRequestError } from '~/core/error.response'
import { signAccessToken, signRefreshToken, compareHash, hashData } from '~/utils/jwt'
import { unGetData } from '~/utils/helpers'

export class AuthService {
  /**
   * Login with username and password
   * Uses User model for authentication
   */
  async login(username: string, password: string) {
    // Find user by username with role, permissions and staff
    const user = await prisma.user.findUnique({
      where: { username },
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
      throw new BadRequestError({ message: 'Invalid username or password' })
    }

    if (user.deletedAt) {
      throw new BadRequestError({ message: 'Account has been deleted' })
    }

    if (user.status !== 'active') {
      throw new BadRequestError({ message: 'Account is not active' })
    }

    // Verify password
    const isPasswordValid = await compareHash(password, user.passwordHash)
    if (!isPasswordValid) {
      throw new BadRequestError({ message: 'Invalid username or password' })
    }

    // Generate tokens
    const [accessToken, refreshToken] = await Promise.all([
      signAccessToken(user.id),
      signRefreshToken(user.id)
    ])

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    })

    // Extract permissions from role
    const permissions = user.role.rolePermissions.map(rp => rp.permissionId)

    return {
      user: {
        ...unGetData({ fields: ['passwordHash', 'deletedAt'], object: user }),
        fullName: user.staff?.fullName, // User fullName comes from Staff
        role: {
          id: user.role.id,
          name: user.role.name,
          description: user.role.description
        },
        permissions
      },
      accessToken,
      refreshToken
    }
  }

  /**
   * Logout - invalidate tokens
   */
  async logout() {
    return { message: 'Logged out successfully' }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(userId: number) {
    // Find user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user || user.deletedAt) {
      throw new AuthRequestError('User not found')
    }

    if (user.status !== 'active') {
      throw new AuthRequestError('Account is not active')
    }

    // Generate new tokens
    const [accessToken, refreshToken] = await Promise.all([
      signAccessToken(user.id),
      signRefreshToken(user.id)
    ])

    return {
      accessToken,
      refreshToken
    }
  }

  /**
   * Get current user profile
   */
  async me(userId: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
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
      throw new BadRequestError({ message: 'User not found' })
    }

    // Extract permissions
    const permissions = user.role.rolePermissions.map(rp => ({
      id: rp.permissionId,
      name: rp.permission.name,
      category: rp.permission.category
    }))

    return {
      ...unGetData({ fields: ['passwordHash', 'deletedAt'], object: user }),
      fullName: user.staff?.fullName, // Include fullName from Staff
      staff: user.staff ? unGetData({ fields: ['createdAt', 'updatedAt', 'deletedAt'], object: user.staff }) : null,
      role: {
        id: user.role.id,
        name: user.role.name,
        description: user.role.description
      },
      permissions
    }
  }

  /**
   * Change username (self)
   */
  async changeUsername(userId: number, newUsername: string) {
    // Check if username already exists
    const existingUser = await prisma.user.findUnique({
      where: { username: newUsername }
    })
    
    if (existingUser) {
      throw new BadRequestError({ message: 'Username already exists' })
    }
    
    const user = await prisma.user.update({
      where: { id: userId },
      data: { username: newUsername }
    })
    
    return {
      id: user.id,
      username: user.username
    }
  }

  /**
   * Change password (self)
   */
  async changePassword(userId: number, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })
    
    if (!user) {
      throw new BadRequestError({ message: 'User not found' })
    }
    
    // Verify current password
    const isPasswordValid = await compareHash(currentPassword, user.passwordHash)
    if (!isPasswordValid) {
      throw new BadRequestError({ message: 'Current password is incorrect' })
    }
    
    // Hash new password
    const passwordHash = await hashData(newPassword)
    
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash }
    })
    
    return { message: 'Password changed successfully' }
  }
}

export const authService = new AuthService()
