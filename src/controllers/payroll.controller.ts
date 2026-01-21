
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

  exportPayroll = async (req: Request, res: Response, next: NextFunction) => {
    const payrollId = Number(req.params.id)
    const buffer = await payrollService.exportPayroll(payrollId) as any
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename=payroll-${payrollId}.xlsx`)
    res.send(buffer)
  }

  finalize = async (req: Request, res: Response, next: NextFunction) => {
    const payrollId = Number(req.params.id)
    
    new OK({
      message: 'Chốt bảng lương thành công',
      metaData: await payrollService.finalize(payrollId)
    }).send(res)
  }

  reloadPayroll = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = Number(req.params.id)
        const payroll = await payrollService.reloadPayroll(id)
        new OK({
            message: 'Reload payroll successfully',
            metaData: payroll
        }).send(res)
    } catch (error) {
        next(error)
    }
  }

  deletePayroll = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = Number(req.params.id)
        await payrollService.deletePayroll(id)
        new OK({
            message: 'Delete payroll successfully',
            metaData: undefined
        }).send(res)
    } catch (error) {
        next(error)
    }
  }
}

export const payrollController = new PayrollController()

