import { Request, Response } from 'express'
import { staffService } from '~/services/staff.service'
import { SuccessResponse } from '~/core/success.response'

class StaffController {
  /**
   * Create new staff
   */
  createStaff = async (req: Request, res: Response) => {
    const result = await staffService.createStaff(req.body)
    new SuccessResponse({
      message: 'Create staff successfully',
      metaData: result
    }).send(res)
  }

  /**
   * Get all staff
   */
  getAllStaff = async (req: Request, res: Response) => {
    const sort = req.sortParsed
    const result = await staffService.getAllStaff({ ...req.query, sort })
    new SuccessResponse({
      message: 'Get staff list successfully',
      metaData: result
    }).send(res)
  }

  /**
   * Get staff by ID
   */
  getStaffById = async (req: Request, res: Response) => {
    const result = await staffService.getStaffById(Number(req.params.id))
    new SuccessResponse({
      message: 'Get staff detail successfully',
      metaData: result
    }).send(res)
  }

  /**
   * Update staff
   */
  updateStaff = async (req: Request, res: Response) => {
    const result = await staffService.updateStaff(Number(req.params.id), req.body)
    new SuccessResponse({
      message: 'Update staff successfully',
      metaData: result
    }).send(res)
  }

  /**
   * Delete staff
   */
  deleteStaff = async (req: Request, res: Response) => {
    const result = await staffService.deleteStaff(Number(req.params.id))
    new SuccessResponse({
      message: 'Delete staff successfully',
      metaData: result
    }).send(res)
  }
}

export const staffController = new StaffController()
