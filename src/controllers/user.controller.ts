import { Request, Response } from 'express'
import { userService } from '~/services/user.service'
import { SuccessResponse, CREATED } from '~/core/success.response'
import { UserStatus } from '~/enums/userStatus.enum'

class UserController {
  /**
   * GET /api/users
   * Get all users with pagination and filters
   */
  getAllUsers = async (req: Request, res: Response) => {
    const query = {
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      search: req.query.search as string | undefined,
      status: req.query.status as UserStatus | undefined,
      roleId: req.query.roleId ? parseInt(req.query.roleId as string) : undefined
    }
    
    const result = await userService.getAllUsers(query)
    
    return new SuccessResponse({
      message: 'Get users successfully',
      metaData: result
    }).send(res)
  }
  
  /**
   * GET /api/users/:id
   * Get user by ID
   */
  getUserById = async (req: Request, res: Response) => {
    const id = parseInt(req.params.id)
    const result = await userService.getUserById(id)
    
    return new SuccessResponse({
      message: 'Get user successfully',
      metaData: result
    }).send(res)
  }
  
  /**
   * POST /api/users
   * Create a new user
   */
  createUser = async (req: Request, res: Response) => {
    const result = await userService.createUser(req.body)
    
    return new CREATED({
      message: 'User created successfully',
      metaData: result
    }).send(res)
  }
  
  /**
   * PATCH /api/users/:id
   * Update user by ID
   */
  updateUser = async (req: Request, res: Response) => {
    const id = parseInt(req.params.id)
    const result = await userService.updateUserById(id, req.body)
    
    return new SuccessResponse({
      message: 'User updated successfully',
      metaData: result
    }).send(res)
  }
  
  /**
   * DELETE /api/users/:id
   * Soft delete user by ID
   */
  deleteUser = async (req: Request, res: Response) => {
    const id = parseInt(req.params.id)
    const result = await userService.deleteUserById(id)
    
    return new SuccessResponse({
      message: result.message
    }).send(res)
  }
  
  /**
   * POST /api/users/:id/restore
   * Restore deleted user
   */
  restoreUser = async (req: Request, res: Response) => {
    const id = parseInt(req.params.id)
    const result = await userService.restoreUserById(id)
    
    return new SuccessResponse({
      message: 'User restored successfully',
      metaData: result
    }).send(res)
  }
}

export const userController = new UserController()
