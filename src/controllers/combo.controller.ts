import { Request, Response } from 'express'
import { comboService } from '~/services/combo.service'
import { SuccessResponse } from '~/core/success.response'

class ComboController {
  /**
   * Create new combo
   */
  create = async (req: Request, res: Response) => {
    const result = await comboService.create(req.body)
    new SuccessResponse({
      message: 'Tạo combo thành công',
      metaData: result
    }).send(res)
  }

  /**
   * Get combo by ID
   */
  getById = async (req: Request, res: Response) => {
    const result = await comboService.getById(Number(req.params.id))
    new SuccessResponse({
      message: 'Lấy combo thành công',
      metaData: result
    }).send(res)
  }

  /**
   * Get all combos with filters
   */
  getAll = async (req: Request, res: Response) => {
    const result = await comboService.getAll({ ...req.query, sort: req.sortParsed } as any)
    new SuccessResponse({
      message: 'Lấy danh sách combo thành công',
      metaData: result
    }).send(res)
  }

  /**
   * Get active combos for POS
   */
  getActive = async (req: Request, res: Response) => {
    const result = await comboService.getActiveCombos()
    new SuccessResponse({
      message: 'Lấy combo đang hoạt động',
      metaData: result
    }).send(res)
  }

  /**
   * Update combo
   */
  update = async (req: Request, res: Response) => {
    const result = await comboService.update(Number(req.params.id), req.body)
    new SuccessResponse({
      message: 'Cập nhật combo thành công',
      metaData: result
    }).send(res)
  }

  /**
   * Delete combo
   */
  delete = async (req: Request, res: Response) => {
    const result = await comboService.delete(Number(req.params.id))
    new SuccessResponse({
      message: 'Xóa combo thành công',
      metaData: result
    }).send(res)
  }

  /**
   * Toggle combo active status
   */
  toggleActive = async (req: Request, res: Response) => {
    const result = await comboService.toggleActive(Number(req.params.id))
    new SuccessResponse({
      message: result.isActive ? 'Đã kích hoạt combo' : 'Đã tạm ngừng combo',
      metaData: result
    }).send(res)
  }
}

export const comboController = new ComboController()
