import { Request, Response } from 'express'
import { roleService } from '~/services/role.service'
import { SuccessResponse, CREATED } from '~/core/success.response'

class RoleController {
  /**
   * GET /api/roles
   * Get all roles with permissions
   */
  getAllRoles = async (req: Request, res: Response) => {
    const result = await roleService.getAllRoles()
    
    return new SuccessResponse({
      message: 'Get roles successfully',
      metaData: { roles: result }
    }).send(res)
  }

  /**
   * GET /api/roles/permissions
   * Get all available permissions (for dropdown in role form)
   */
  getAllPermissions = async (req: Request, res: Response) => {
    const result = await roleService.getAllPermissions()
    
    return new SuccessResponse({
      message: 'Get permissions successfully',
      metaData: { permissions: result }
    }).send(res)
  }

  /**
   * GET /api/roles/:id
   * Get role by ID with permissions
   */
  getRoleById = async (req: Request, res: Response) => {
    const id = parseInt(req.params.id)
    const result = await roleService.getRoleById(id)
    
    return new SuccessResponse({
      message: 'Get role successfully',
      metaData: result
    }).send(res)
  }

  /**
   * POST /api/roles
   * Create a new role with permissions
   */
  createRole = async (req: Request, res: Response) => {
    const result = await roleService.createRole(req.body)
    
    return new CREATED({
      message: 'Role created successfully',
      metaData: result
    }).send(res)
  }

  /**
   * PATCH /api/roles/:id
   * Update role by ID
   */
  updateRole = async (req: Request, res: Response) => {
    const id = parseInt(req.params.id)
    const result = await roleService.updateRoleById(id, req.body)
    
    return new SuccessResponse({
      message: 'Role updated successfully',
      metaData: result
    }).send(res)
  }

  /**
   * DELETE /api/roles/:id
   * Delete role by ID
   */
  deleteRole = async (req: Request, res: Response) => {
    const id = parseInt(req.params.id)
    const result = await roleService.deleteRoleById(id)
    
    return new SuccessResponse({
      message: result.message
    }).send(res)
  }
}

export const roleController = new RoleController()
