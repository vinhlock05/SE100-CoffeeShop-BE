import { prisma } from '~/config/database'
import { BadRequestError, NotFoundRequestError } from '~/core/error.response'
import { CreateRoleDto, UpdateRoleDto } from '~/dtos/role'

export class RoleService {
  /**
   * Get all roles with their permissions
   */
  async getAllRoles() {
    const roles = await prisma.role.findMany({
      where: { deletedAt: null },
      include: {
        rolePermissions: {
          include: {
            permission: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    return roles.map(role => ({
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      permissions: role.rolePermissions.map(rp => rp.permissionId),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt
    }))
  }

  /**
   * Get all permissions (for UI dropdown)
   */
  async getAllPermissions() {
    const permissions = await prisma.permission.findMany({
      orderBy: [{ category: 'asc' }, { id: 'asc' }]
    })
    
    return permissions
  }

  /**
   * Get role by ID with permissions
   */
  async getRoleById(id: number) {
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        rolePermissions: {
          include: {
            permission: true
          }
        }
      }
    })

    if (!role || role.deletedAt) {
      throw new NotFoundRequestError('Role not found')
    }

    return {
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      permissions: role.rolePermissions.map(rp => ({
        id: rp.permissionId,
        name: rp.permission.name,
        category: rp.permission.category
      })),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt
    }
  }

  /**
   * Create a new role with permissions
   */
  async createRole(dto: CreateRoleDto) {
    // Check if role name already exists
    const existingRole = await prisma.role.findUnique({
      where: { name: dto.name }
    })

    if (existingRole) {
      throw new BadRequestError({ message: 'Role name already exists' })
    }

    // Validate permissions exist
    if (dto.permissions.length > 0) {
      const validPermissions = await prisma.permission.findMany({
        where: { id: { in: dto.permissions } }
      })
      
      if (validPermissions.length !== dto.permissions.length) {
        throw new BadRequestError({ message: 'Invalid permission IDs' })
      }
    }

    // Create role with permissions
    const role = await prisma.role.create({
      data: {
        name: dto.name,
        description: dto.description,
        isSystem: dto.isSystem || false,
        rolePermissions: {
          create: dto.permissions.map(permId => ({
            permissionId: permId
          }))
        }
      },
      include: {
        rolePermissions: {
          include: {
            permission: true
          }
        }
      }
    })

    return {
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      permissions: role.rolePermissions.map(rp => rp.permissionId),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt
    }
  }

  /**
   * Update role by ID
   */
  async updateRoleById(id: number, dto: UpdateRoleDto) {
    // Check if role exists
    const existingRole = await prisma.role.findUnique({
      where: { id }
    })

    if (!existingRole || existingRole.deletedAt) {
      throw new NotFoundRequestError('Role not found')
    }

    // Check if name is being changed and already exists
    if (dto.name && dto.name !== existingRole.name) {
      const duplicateName = await prisma.role.findUnique({
        where: { name: dto.name }
      })
      if (duplicateName) {
        throw new BadRequestError({ message: 'Role name already exists' })
      }
    }

    // If permissions are being updated
    if (dto.permissions) {
      // Validate permissions exist
      const validPermissions = await prisma.permission.findMany({
        where: { id: { in: dto.permissions } }
      })
      
      if (validPermissions.length !== dto.permissions.length) {
        throw new BadRequestError({ message: 'Invalid permission IDs' })
      }

      // Delete existing role permissions and create new ones
      await prisma.rolePermission.deleteMany({
        where: { roleId: id }
      })

      await prisma.rolePermission.createMany({
        data: dto.permissions.map(permId => ({
          roleId: id,
          permissionId: permId
        }))
      })
    }

    // Update role
    const role = await prisma.role.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.isSystem !== undefined && { isSystem: dto.isSystem })
      },
      include: {
        rolePermissions: {
          include: {
            permission: true
          }
        }
      }
    })

    return {
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      permissions: role.rolePermissions.map(rp => rp.permissionId),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt
    }
  }

  /**
   * Delete role by ID (soft delete)
   */
  async deleteRoleById(id: number) {
    // Check if role exists
    const existingRole = await prisma.role.findUnique({
      where: { id }
    })

    if (!existingRole || existingRole.deletedAt) {
      throw new NotFoundRequestError('Role not found')
    }

    if (existingRole.isSystem) {
      throw new BadRequestError({ message: 'Cannot delete system role' })
    }

    // Check if role is in use
    const usersWithRole = await prisma.user.count({
      where: { roleId: id, deletedAt: null }
    })

    if (usersWithRole > 0) {
      throw new BadRequestError({ 
        message: `Cannot delete role. ${usersWithRole} user(s) are using this role.` 
      })
    }

    // Soft delete
    await prisma.role.update({
      where: { id },
      data: { deletedAt: new Date() }
    })

    return { message: 'Role deleted successfully' }
  }
}

export const roleService = new RoleService()
