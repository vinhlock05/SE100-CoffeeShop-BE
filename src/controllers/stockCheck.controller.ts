import { Request, Response } from 'express'
import { stockCheckService } from '~/services/stockCheck.service'
import { SuccessResponse } from '~/core/success.response'

class StockCheckController {
  /**
   * Tạo phiên kiểm kê mới
   */
  create = async (req: Request, res: Response) => {
    const staffId = req.user?.staffId
    const result = await stockCheckService.create(req.body, staffId)
    new SuccessResponse({
      message: 'Tạo phiên kiểm kê thành công',
      metaData: result
    }).send(res)
  }

  /**
   * Lấy danh sách phiên kiểm kê
   */
  getAll = async (req: Request, res: Response) => {
    const result = await stockCheckService.getAll(req.query as any)
    new SuccessResponse({
      message: 'Lấy danh sách phiên kiểm kê thành công',
      metaData: result
    }).send(res)
  }

  /**
   * Lấy chi tiết phiên kiểm kê
   */
  getById = async (req: Request, res: Response) => {
    const result = await stockCheckService.getById(Number(req.params.id))
    new SuccessResponse({
      message: 'Lấy thông tin phiên kiểm kê thành công',
      metaData: result
    }).send(res)
  }

  /**
   * Cập nhật phiên kiểm kê
   */
  update = async (req: Request, res: Response) => {
    const result = await stockCheckService.update(Number(req.params.id), req.body)
    new SuccessResponse({
      message: 'Cập nhật phiên kiểm kê thành công',
      metaData: result
    }).send(res)
  }

  /**
   * Hoàn thành phiên kiểm kê
   */
  complete = async (req: Request, res: Response) => {
    const result = await stockCheckService.complete(Number(req.params.id))
    new SuccessResponse({
      message: 'Hoàn thành phiên kiểm kê thành công',
      metaData: result
    }).send(res)
  }

  /**
   * Huỷ phiên kiểm kê
   */
  cancel = async (req: Request, res: Response) => {
    const result = await stockCheckService.cancel(Number(req.params.id))
    new SuccessResponse({
      message: result.message,
      metaData: result
    }).send(res)
  }
}

export const stockCheckController = new StockCheckController()
