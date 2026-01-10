import { Request, Response } from 'express'
import { unitService } from '~/services/unit.service'
import { SuccessResponse } from '~/core/success.response'

class UnitController {
  /**
   * Create new unit
   */
  createUnit = async (req: Request, res: Response) => {
    const result = await unitService.createUnit(req.body)
    new SuccessResponse({
      message: 'Tạo đơn vị thành công',
      metaData: result
    }).send(res)
  }

  /**
   * Get all units
   */
  getAllUnits = async (req: Request, res: Response) => {
    const result = await unitService.getAllUnits()
    new SuccessResponse({
      message: 'Lấy danh sách đơn vị thành công',
      metaData: result
    }).send(res)
  }

  /**
   * Get unit by ID
   */
  getUnitById = async (req: Request, res: Response) => {
    const result = await unitService.getUnitById(Number(req.params.id))
    new SuccessResponse({
      message: 'Lấy thông tin đơn vị thành công',
      metaData: result
    }).send(res)
  }

  /**
   * Update unit
   */
  updateUnit = async (req: Request, res: Response) => {
    const result = await unitService.updateUnit(Number(req.params.id), req.body)
    new SuccessResponse({
      message: 'Cập nhật đơn vị thành công',
      metaData: result
    }).send(res)
  }

  /**
   * Delete unit
   */
  deleteUnit = async (req: Request, res: Response) => {
    const result = await unitService.deleteUnit(Number(req.params.id))
    new SuccessResponse({
      message: 'Xóa đơn vị thành công',
      metaData: result
    }).send(res)
  }
}

export const unitController = new UnitController()
