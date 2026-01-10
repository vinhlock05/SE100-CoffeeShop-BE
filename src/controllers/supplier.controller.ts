import { Request, Response } from 'express'
import { supplierService } from '~/services/supplier.service'
import { SuccessResponse } from '~/core/success.response'

class SupplierController {
  /**
   * Create new supplier
   */
  create = async (req: Request, res: Response) => {
    const result = await supplierService.create(req.body)
    new SuccessResponse({
      message: 'Tạo nhà cung cấp thành công',
      metaData: result
    }).send(res)
  }

  /**
   * Get all suppliers with filters
   */
  getAll = async (req: Request, res: Response) => {
    const result = await supplierService.getAll(req.query as any)
    new SuccessResponse({
      message: 'Lấy danh sách nhà cung cấp thành công',
      metaData: result
    }).send(res)
  }

  /**
   * Get supplier by ID
   */
  getById = async (req: Request, res: Response) => {
    const result = await supplierService.getById(Number(req.params.id))
    new SuccessResponse({
      message: 'Lấy thông tin nhà cung cấp thành công',
      metaData: result
    }).send(res)
  }

  /**
   * Update supplier
   */
  update = async (req: Request, res: Response) => {
    const result = await supplierService.update(Number(req.params.id), req.body)
    new SuccessResponse({
      message: 'Cập nhật nhà cung cấp thành công',
      metaData: result
    }).send(res)
  }

  /**
   * Delete supplier
   */
  delete = async (req: Request, res: Response) => {
    const result = await supplierService.delete(Number(req.params.id))
    new SuccessResponse({
      message: result.message,
      metaData: result
    }).send(res)
  }

  /**
   * Toggle supplier status
   */
  toggleStatus = async (req: Request, res: Response) => {
    const result = await supplierService.toggleStatus(Number(req.params.id))
    new SuccessResponse({
      message: `Nhà cung cấp đã được ${result.status === 'active' ? 'kích hoạt' : 'vô hiệu hóa'}`,
      metaData: result
    }).send(res)
  }
}

export const supplierController = new SupplierController()
