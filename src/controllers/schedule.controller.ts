
import { NextFunction, Request, Response } from 'express'
import { CREATED, OK } from '~/core/success.response'
import { scheduleService } from '~/services/schedule.service'

class ScheduleController {
  createOne = async (req: Request, res: Response, next: NextFunction) => {
    new CREATED({
      message: 'Xếp lịch thành công',
      metaData: await scheduleService.createSchedule(req.body)
    }).send(res)
  }

  createBulk = async (req: Request, res: Response, next: NextFunction) => {
      new CREATED({
          message: 'Xếp lịch hàng loạt thành công',
          metaData: await scheduleService.createBulkSchedule(req.body)
      }).send(res)
  }

  getAll = async (req: Request, res: Response, next: NextFunction) => {
    new OK({
      message: 'Lấy danh sách lịch làm việc thành công',
      metaData: await scheduleService.getSchedules(req.query)
    }).send(res)
  }

  delete = async (req: Request, res: Response, next: NextFunction) => {
    new OK({
      message: 'Xóa lịch làm việc thành công',
      metaData: await scheduleService.deleteSchedule(Number(req.params.id))
    }).send(res)
  }

  swap = async (req: Request, res: Response, next: NextFunction) => {
    const { from, to } = req.body
    new OK({
      message: 'Đổi ca thành công',
      metaData: await scheduleService.swapSchedule(from, to)
    }).send(res)
  }
}

export const scheduleController = new ScheduleController()

