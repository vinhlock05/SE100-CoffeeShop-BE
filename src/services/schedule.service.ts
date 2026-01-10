
import { prisma } from '~/config/database'
import { BadRequestError, NotFoundRequestError } from '~/core/error.response'
import { CreateScheduleDto, ScheduleQueryDto, UpdateScheduleDto, BulkCreateScheduleDto } from '~/dtos/schedule'

export class ScheduleService {
  /**
   * Create schedules for one staff on one date with multiple shifts
   */
  async createSchedule(dto: CreateScheduleDto) {
    const staff = await prisma.staff.findUnique({ where: { id: dto.staffId } })
    if (!staff) throw new NotFoundRequestError('Staff not found')

    const workDate = new Date(dto.workDate)
    const results = []

    for (const shiftId of dto.shiftIds) {
      const shift = await prisma.shift.findUnique({ where: { id: shiftId } })
      if (!shift) throw new NotFoundRequestError(`Shift ${shiftId} not found`)
      if (!shift.isActive) throw new BadRequestError({ message: `Ca ${shift.name} đang tạm ngưng, không thể xếp lịch` })

      // Check duplicate
      const existing = await prisma.staffSchedule.findFirst({
        where: {
          staffId: dto.staffId,
          shiftId: shiftId,
          workDate: workDate
        }
      })

      if (!existing) {
        const created = await prisma.staffSchedule.create({
          data: {
            staffId: dto.staffId,
            shiftId: shiftId,
            workDate: workDate,
            notes: dto.notes
          }
        })
        results.push(created)
      }
    }

    return results
  }

  /**
   * Create multiple schedules (bulk)
   */
  async createBulkSchedule(dto: BulkCreateScheduleDto) {
    return await prisma.$transaction(async (tx) => {
      const results = []
      
      for (const item of dto.schedules) {
        const workDate = new Date(item.workDate)
        
        for (const shiftId of item.shiftIds) {
          const existing = await tx.staffSchedule.findFirst({
            where: { staffId: item.staffId, shiftId, workDate }
          })
          
          if (!existing) {
            const res = await tx.staffSchedule.create({
              data: {
                staffId: item.staffId,
                shiftId,
                workDate,
                notes: item.notes
              }
            })
            results.push(res)
          }
        }
      }
      return results
    })
  }

  /**
   * Get schedules
   */
  async getSchedules(query: ScheduleQueryDto) {
    const where: any = {}
    
    if (query.staffId) where.staffId = Number(query.staffId)
    if (query.shiftId) where.shiftId = Number(query.shiftId)
    
    if (query.from || query.to) {
        where.workDate = {}
        if (query.from) where.workDate.gte = new Date(query.from)
        if (query.to) where.workDate.lte = new Date(query.to)
    }

    return await prisma.staffSchedule.findMany({
        where,
        include: {
            staff: { select: { id: true, fullName: true, code: true, salarySetting: true } },
            shift: true
        },
        orderBy: { workDate: 'asc' }
    })
  }

  /**
   * Delete schedule
   */
  async deleteSchedule(id: number) {
      const exists = await prisma.staffSchedule.findUnique({ where: { id } })
      if (!exists) throw new NotFoundRequestError('Schedule not found')
      
      return await prisma.staffSchedule.delete({ where: { id } })
  }

  /**
   * Swap schedules between two staff members
   */
  async swapSchedule(from: { staffId: number; shiftId: number; workDate: string }, to: { staffId: number; shiftId: number; workDate: string }) {
    return await prisma.$transaction(async (tx) => {
      const fromDate = new Date(from.workDate)
      const toDate = new Date(to.workDate)

      // Find existing schedules
      const fromSchedule = await tx.staffSchedule.findFirst({
        where: {
          staffId: from.staffId,
          shiftId: from.shiftId,
          workDate: fromDate
        }
      })

      const toSchedule = await tx.staffSchedule.findFirst({
        where: {
          staffId: to.staffId,
          shiftId: to.shiftId,
          workDate: toDate
        }
      })

      // Case 1: Both schedules exist - swap staffIds
      if (fromSchedule && toSchedule) {
        await tx.staffSchedule.update({
          where: { id: fromSchedule.id },
          data: { staffId: to.staffId }
        })
        await tx.staffSchedule.update({
          where: { id: toSchedule.id },
          data: { staffId: from.staffId }
        })
        return { message: 'Đổi ca thành công' }
      }

      // Case 2: Only fromSchedule exists - transfer to new staff
      if (fromSchedule && !toSchedule) {
        await tx.staffSchedule.update({
          where: { id: fromSchedule.id },
          data: { 
            staffId: to.staffId,
            workDate: toDate,
            shiftId: to.shiftId
          }
        })
        return { message: 'Chuyển ca thành công' }
      }

      // Case 3: Only toSchedule exists - transfer to original staff
      if (!fromSchedule && toSchedule) {
        await tx.staffSchedule.update({
          where: { id: toSchedule.id },
          data: { 
            staffId: from.staffId,
            workDate: fromDate,
            shiftId: from.shiftId
          }
        })
        return { message: 'Chuyển ca thành công' }
      }

      // Case 4: Neither exists
      throw new NotFoundRequestError('Không tìm thấy lịch làm việc để đổi')
    })
  }
}

export const scheduleService = new ScheduleService()

