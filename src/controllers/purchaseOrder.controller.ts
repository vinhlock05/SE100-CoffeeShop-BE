import { Request, Response } from 'express'
import { purchaseOrderService } from '~/services/purchaseOrder.service'
import { SuccessResponse } from '~/core/success.response'

class PurchaseOrderController {
  /**
   * Tạo phiếu nhập hàng mới
   */
  create = async (req: Request, res: Response) => {
    const staffId = req.user?.staffId
    const result = await purchaseOrderService.create(req.body, staffId)
    new SuccessResponse({
      message: 'Tạo phiếu nhập hàng thành công',
      metaData: result
    }).send(res)
  }

  /**
   * Lấy danh sách phiếu nhập hàng
   */
  getAll = async (req: Request, res: Response) => {
    const result = await purchaseOrderService.getAll({ ...req.query, sort: req.sortParsed } as any)
    new SuccessResponse({
      message: 'Lấy danh sách phiếu nhập hàng thành công',
      metaData: result
    }).send(res)
  }

  /**
   * Lấy chi tiết phiếu nhập hàng theo ID
   */
  getById = async (req: Request, res: Response) => {
    const result = await purchaseOrderService.getById(Number(req.params.id))
    new SuccessResponse({
      message: 'Lấy thông tin phiếu nhập hàng thành công',
      metaData: result
    }).send(res)
  }

  /**
   * Cập nhật phiếu nhập hàng (chỉ phiếu tạm)
   */
  update = async (req: Request, res: Response) => {
    const result = await purchaseOrderService.update(Number(req.params.id), req.body)
    new SuccessResponse({
      message: 'Cập nhật phiếu nhập hàng thành công',
      metaData: result
    }).send(res)
  }

  /**
   * Hoàn thành phiếu nhập - cập nhật tồn kho
   */
  complete = async (req: Request, res: Response) => {
    const result = await purchaseOrderService.complete(Number(req.params.id))
    new SuccessResponse({
      message: 'Hoàn thành phiếu nhập hàng thành công',
      metaData: result
    }).send(res)
  }

  /**
   * Huỷ phiếu nhập hàng
   */
  cancel = async (req: Request, res: Response) => {
    const result = await purchaseOrderService.cancel(Number(req.params.id))
    new SuccessResponse({
      message: result.message,
      metaData: result
    }).send(res)
  }
}

export const purchaseOrderController = new PurchaseOrderController()
