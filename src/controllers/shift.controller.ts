import { NextFunction, Request, Response } from 'express'
import { CREATED, OK } from '~/core/success.response'
import { shiftService } from '~/services/shift.service'

class ShiftController {
  createShift = async (req: Request, res: Response, next: NextFunction) => {
    new CREATED({
      message: 'Tạo ca làm việc thành công',
      metaData: await shiftService.create(req.body)
    }).send(res)
  }

  getAllShifts = async (req: Request, res: Response, next: NextFunction) => {
    const isActive = req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined
    new OK({
      message: 'Lấy danh sách ca làm việc thành công',
      metaData: await shiftService.findAll(isActive)
    }).send(res)
  }

  getShiftById = async (req: Request, res: Response, next: NextFunction) => {
    new OK({
      message: 'Lấy thông tin ca làm việc thành công',
      metaData: await shiftService.findById(Number(req.params.id))
    }).send(res)
  }

  updateShift = async (req: Request, res: Response, next: NextFunction) => {
    new OK({
      message: 'Cập nhật ca làm việc thành công',
      metaData: await shiftService.update(Number(req.params.id), req.body)
    }).send(res)
  }

  deleteShift = async (req: Request, res: Response, next: NextFunction) => {
    await shiftService.delete(Number(req.params.id))
    new OK({
      message: 'Xóa ca làm việc thành công'
    }).send(res)
  }

  toggleActive = async (req: Request, res: Response, next: NextFunction) => {
    new OK({
      message: 'Thay đổi trạng thái ca thành công',
      metaData: await shiftService.toggleActive(Number(req.params.id))
    }).send(res)
  }
}

export const shiftController = new ShiftController()
