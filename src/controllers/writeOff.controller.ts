import { Request, Response } from 'express'
import { writeOffService } from '~/services/writeOff.service'
import { SuccessResponse } from '~/core/success.response'

class WriteOffController {
  /**
   * Tạo phiếu xuất huỷ mới
   */
  create = async (req: Request, res: Response) => {
    const staffId = req.user?.staffId
    const result = await writeOffService.create(req.body, staffId)
    new SuccessResponse({
      message: 'Tạo phiếu xuất huỷ thành công',
      metaData: result
    }).send(res)
  }

  /**
   * Lấy danh sách phiếu xuất huỷ
   */
  getAll = async (req: Request, res: Response) => {
    const result = await writeOffService.getAll(req.query as any)
    new SuccessResponse({
      message: 'Lấy danh sách phiếu xuất huỷ thành công',
      metaData: result
    }).send(res)
  }

  /**
   * Lấy chi tiết phiếu xuất huỷ
   */
  getById = async (req: Request, res: Response) => {
    const result = await writeOffService.getById(Number(req.params.id))
    new SuccessResponse({
      message: 'Lấy thông tin phiếu xuất huỷ thành công',
      metaData: result
    }).send(res)
  }

  /**
   * Cập nhật phiếu xuất huỷ
   */
  update = async (req: Request, res: Response) => {
    const result = await writeOffService.update(Number(req.params.id), req.body)
    new SuccessResponse({
      message: 'Cập nhật phiếu xuất huỷ thành công',
      metaData: result
    }).send(res)
  }

  /**
   * Hoàn thành phiếu xuất huỷ
   */
  complete = async (req: Request, res: Response) => {
    const result = await writeOffService.complete(Number(req.params.id))
    new SuccessResponse({
      message: 'Hoàn thành phiếu xuất huỷ thành công',
      metaData: result
    }).send(res)
  }

  /**
   * Huỷ phiếu xuất huỷ
   */
  cancel = async (req: Request, res: Response) => {
    const result = await writeOffService.cancel(Number(req.params.id))
    new SuccessResponse({
      message: result.message,
      metaData: result
    }).send(res)
  }
}

export const writeOffController = new WriteOffController()
