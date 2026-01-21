import { NextFunction, Request, Response } from 'express'
import { CREATED, OK } from '~/core/success.response'
import { timekeepingService } from '~/services/timekeeping.service'
import { BadRequestError } from '~/core/error.response'

class TimekeepingController {
  checkIn = async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user
    if (!user.staffId) {
        throw new BadRequestError({ message: 'Tài khoản không liên kết với hồ sơ nhân viên' })
    }
    
    new CREATED({
      message: 'Chấm công vào thành công',
      metaData: await timekeepingService.checkIn(user.staffId, req.body)
    }).send(res)
  }

  checkOut = async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user
    if (!user.staffId) {
        throw new BadRequestError({ message: 'Tài khoản không liên kết với hồ sơ nhân viên' })
    }

    new OK({
      message: 'Chấm công ra thành công',
      metaData: await timekeepingService.checkOut(user.staffId, req.body)
    }).send(res)
  }

  /**
   * Chấm công hàng loạt (Admin)
   */
  bulkCheckIn = async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user
    
    new CREATED({
      message: 'Chấm công hàng loạt thành công',
      metaData: await timekeepingService.bulkCheckIn(req.body, user.staffId)
    }).send(res)
  }

  /**
   * Lấy tất cả chấm công (Admin)
   */
  getAll = async (req: Request, res: Response, next: NextFunction) => {
    new OK({
      message: 'Lấy danh sách chấm công thành công',
      metaData: await timekeepingService.getAll(req.query as any)
    }).send(res)
  }

  /**
   * Cập nhật chấm công (Admin)
   */
  update = async (req: Request, res: Response, next: NextFunction) => {
    const id = Number(req.params.id)
    
    new OK({
      message: 'Cập nhật chấm công thành công',
      metaData: await timekeepingService.update(id, req.body)
    }).send(res)
  }

  /**
   * Tạo chấm công thủ công (Admin)
   */
  create = async (req: Request, res: Response, next: NextFunction) => {
    new CREATED({
        message: 'Tạo chấm công thành công',
        metaData: await timekeepingService.create(req.body)
    }).send(res)
  }
}

export const timekeepingController = new TimekeepingController()

