import { prisma } from '~/config/database'
import { BadRequestError, NotFoundRequestError } from '~/core/error.response'
import { hashData } from '~/utils/jwt'
import { unGetData, parsePagination } from '~/utils/helpers'
import { CreateUserDto, UpdateUserDto, UserQueryDto } from '~/dtos/user'
import { UserStatus } from '~/enums/userStatus.enum'
import { Prisma } from '@prisma/client'

export class UserService {
  /**
   * Create a new user
   */
  async createUser(dto: CreateUserDto) {
    // Check if username already exists
    const existingUser = await prisma.user.findUnique({
      where: { username: dto.username }
    })
    
    if (existingUser) {
      throw new BadRequestError({ message: 'Username already exists' })
    }
    
    // Check if role exists
    const role = await prisma.role.findUnique({
      where: { id: dto.roleId }
    })
    
    if (!role) {
      throw new BadRequestError({ message: 'Role not found' })
    }
    
    // Create user with hashed password
    const user = await prisma.user.create({
      data: {
        username: dto.username,
        passwordHash: hashData(dto.password),
        roleId: dto.roleId,
        status: 'active'
      },
      include: {
        role: true,
        staff: true
      }
    })
    
    return unGetData({ fields: ['passwordHash', 'deletedAt'], object: user })
  }
  
  /**
   * Get all users with pagination and filters
   */
  async getAllUsers(query: UserQueryDto) {
    const { page, limit, skip } = parsePagination(query.page, query.limit)
    
    // Build where clause
    const where: Prisma.UserWhereInput = {
      deletedAt: null
    }
    
    if (query.search) {
      where.OR = [
        { username: { contains: query.search, mode: 'insensitive' } },
        { staff: { fullName: { contains: query.search, mode: 'insensitive' } } }
      ]
    }
    
    if (query.status) {
      where.status = query.status
    }
    
    if (query.roleId) {
      where.roleId = query.roleId
    }
    
    // Get users with count
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          username: true,
          roleId: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          lastLogin: true,
          role: {
            select: {
              id: true,
              name: true,
              description: true
            }
          },
          staff: {
            select: {
              id: true,
              code: true,
              fullName: true
            }
          }
        }
      }),
      prisma.user.count({ where })
    ])
    
    return {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      limit,
      total,
      users
    }
  }
  
  /**
   * Get user by ID
   */
  async getUserById(id: number) {
    const user = await prisma.user.findUnique({
      where: { id },
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
    
    if (!user || user.deletedAt) {
      throw new NotFoundRequestError('User not found')
    }
    
    // Extract permissions
    const permissions = user.role.rolePermissions.map(rp => ({
      id: rp.permissionId,
      name: rp.permission.name,
      category: rp.permission.category
    }))
    
    return {
      ...unGetData({ fields: ['passwordHash', 'deletedAt'], object: user }),
      role: {
        id: user.role.id,
        name: user.role.name,
        description: user.role.description
      },
      permissions
    }
  }
  
  /**
   * Update user by ID
   */
  async updateUserById(id: number, dto: UpdateUserDto) {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    })
    
    if (!existingUser || existingUser.deletedAt) {
      throw new NotFoundRequestError('User not found')
    }
    
    // Check if role exists (if updating role)
    if (dto.roleId) {
      const role = await prisma.role.findUnique({
        where: { id: dto.roleId }
      })
      
      if (!role) {
        throw new BadRequestError({ message: 'Role not found' })
      }
    }
    
    // Build update data
    const updateData: Prisma.UserUpdateInput = {}
    
    if (dto.roleId) updateData.role = { connect: { id: dto.roleId } }
    if (dto.status) updateData.status = dto.status
    if (dto.newPassword) updateData.passwordHash = hashData(dto.newPassword)
    
    // Update user
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        role: true
      }
    })
    
    return unGetData({ fields: ['passwordHash', 'deletedAt'], object: user })
  }
  
  /**
   * Soft delete user by ID
   */
  async deleteUserById(id: number) {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    })
    
    if (!existingUser || existingUser.deletedAt) {
      throw new NotFoundRequestError('User not found')
    }
    
    // Soft delete
    await prisma.user.update({
      where: { id },
      data: {
        status: UserStatus.DELETED,
        deletedAt: new Date()
      }
    })
    
    return { message: 'User deleted successfully' }
  }
  
  /**
   * Restore deleted user by ID
   */
  async restoreUserById(id: number) {
    // Check if user exists and is deleted
    const existingUser = await prisma.user.findUnique({
      where: { id }
    })
    
    if (!existingUser) {
      throw new NotFoundRequestError('User not found')
    }
    
    if (!existingUser.deletedAt) {
      throw new BadRequestError({ message: 'User is not deleted' })
    }
    
    // Restore user
    const user = await prisma.user.update({
      where: { id },
      data: {
        status: UserStatus.ACTIVE,
        deletedAt: null
      },
      include: {
        role: true
      }
    })
    
    return unGetData({ fields: ['passwordHash', 'deletedAt'], object: user })
  }
}

export const userService = new UserService()
