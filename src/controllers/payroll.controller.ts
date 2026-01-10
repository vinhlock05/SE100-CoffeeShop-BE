
import { NextFunction, Request, Response } from 'express'
import { CREATED, OK } from '~/core/success.response'
import { payrollService } from '~/services/payroll.service'
import { BadRequestError } from '~/core/error.response'

class PayrollController {
  create = async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user
    if (!user.staffId) {
        throw new BadRequestError({ message: 'Người tạo phải là nhân viên' })
    }

    new CREATED({
      message: 'Tạo bảng lương thành công',
      metaData: await payrollService.createPayroll(req.body, user.staffId)
    }).send(res)
  }

  getAll = async (req: Request, res: Response, next: NextFunction) => {
    new OK({
      message: 'Lấy danh sách bảng lương thành công',
      metaData: await payrollService.getPayrolls(req.query)
    }).send(res)
  }

  getPayslips = async (req: Request, res: Response, next: NextFunction) => {
    new OK({
      message: 'Lấy chi tiết phiếu lương thành công',
      metaData: await payrollService.getPayslips(Number(req.params.id))
    }).send(res)
  }

  updatePayslip = async (req: Request, res: Response, next: NextFunction) => {
    const payrollId = Number(req.params.id)
    const staffId = Number(req.params.staffId)
    
    new OK({
      message: 'Cập nhật phiếu lương thành công',
      metaData: await payrollService.updatePayslip(payrollId, staffId, req.body)
    }).send(res)
  }

  addPayment = async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user
    const payrollId = Number(req.params.id)
    
    new CREATED({
      message: 'Thanh toán thành công',
      metaData: await payrollService.addPayment(payrollId, req.body, user.staffId)
    }).send(res)
  }

  finalize = async (req: Request, res: Response, next: NextFunction) => {
    const payrollId = Number(req.params.id)
    
    new OK({
      message: 'Chốt bảng lương thành công',
      metaData: await payrollService.finalize(payrollId)
    }).send(res)
  }
}

export const payrollController = new PayrollController()

