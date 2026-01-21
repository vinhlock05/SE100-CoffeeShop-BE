import { prisma } from '~/config/database'
import { CheckInDto, CheckOutDto, BulkTimekeepingDto, UpdateTimekeepingDto, TimekeepingQueryDto } from '~/dtos/timekeeping'
import { BadRequestError, NotFoundRequestError } from '~/core/error.response'

class TimekeepingService {
  async checkIn(userId: number, data: CheckInDto) {
    // 1. Check if user already checked in for this shift today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Note: Schema field is 'workDate'
    const existingRecord = await prisma.timekeeping.findFirst({
      where: {
        staffId: userId,
        shiftId: data.shiftId,
        workDate: { gte: today }
      }
    })

    if (existingRecord) {
      throw new BadRequestError({ message: 'Bạn đã chấm công cho ca này rồi' })
    }

    // 2. Validate Shift & Time
    const shift = await prisma.shift.findUnique({ where: { id: data.shiftId } })
    if (!shift) throw new NotFoundRequestError('Ca làm việc không tồn tại')
    if (!shift.isActive) throw new BadRequestError({ message: 'Ca làm việc này đang không hoạt động' })

    const now = new Date()
    const currentTime = now.getUTCHours() * 60 + now.getUTCMinutes() 

    const getMinutes = (date: Date) => date.getUTCHours() * 60 + date.getUTCMinutes()

    const checkInStart = getMinutes(shift.checkInTime)
    const checkInEnd = getMinutes(shift.checkOutTime)

    if (currentTime < checkInStart || currentTime > checkInEnd) {
       throw new BadRequestError({ message: `Chỉ được phép chấm công từ ${this.formatTime(shift.checkInTime)} đến ${this.formatTime(shift.checkOutTime)}` })
    }

    // 3. Create Record
    const shiftStart = getMinutes(shift.startTime)
    let status = 'on-time' 
    
    if (currentTime > shiftStart) {
        status = 'late'
    }

    return await prisma.timekeeping.create({
      data: {
        staffId: userId,
        shiftId: data.shiftId,
        workDate: new Date(),
        clockIn: now,
        status: status, 
        notes: data.note
      }
    })
  }

  async checkOut(userId: number, data: CheckOutDto) {
    const record = await prisma.timekeeping.findFirst({
      where: {
        staffId: userId,
        clockOut: null
      },
      orderBy: { clockIn: 'desc' },
      include: { shift: true } 
    })

    if (!record) {
      throw new BadRequestError({ message: 'Bạn chưa chấm công vào hoặc đã chấm công ra rồi' })
    }
    
    // Check if shift is null (should not happen if logic correct but Prisma types allow null)
    if (!record.shift) {
         throw new BadRequestError({ message: 'Không tìm thấy thông tin ca làm việc' })
    }

    const now = new Date()
    const shift = record.shift
    
    const getMinutes = (date: Date) => date.getUTCHours() * 60 + date.getUTCMinutes()
    const checkOutTime = getMinutes(now)
    const shiftEnd = getMinutes(shift.endTime)
    
    let newStatus = record.status

    if (checkOutTime < shiftEnd) {
       if (newStatus === 'on-time') {
           newStatus = 'early'
       }
    }

    // record.clockIn might be null in type definition, but valid record has it.
    // If clockIn is null, logic fails.
    if (!record.clockIn) {
        throw new BadRequestError({ message: 'Dữ liệu chấm công không hợp lệ (thiếu giờ vào)' })
    }

    const durationMs = now.getTime() - record.clockIn.getTime()
    const durationHours = durationMs / (1000 * 60 * 60)

    return await prisma.timekeeping.update({
      where: { id: record.id },
      data: {
        clockOut: now,
        status: newStatus,
        notes: data.note ? (record.notes ? `${record.notes}; ${data.note}` : data.note) : record.notes,
        totalHours: durationHours
      }
    })
  }

  /**
   * Chấm công hàng loạt (Admin)
   */
  async bulkCheckIn(data: BulkTimekeepingDto, createdBy: number) {
    const workDate = new Date(data.date)
    workDate.setHours(0, 0, 0, 0)

    const shift = await prisma.shift.findUnique({ where: { id: data.shiftId } })
    if (!shift) throw new NotFoundRequestError('Ca làm việc không tồn tại')

    // Parse check-in/out times
    const [checkInHour, checkInMin] = data.checkIn.split(':').map(Number)
    const [checkOutHour, checkOutMin] = data.checkOut.split(':').map(Number)

    const clockIn = new Date(workDate)
    clockIn.setHours(checkInHour, checkInMin, 0, 0)

    const clockOut = new Date(workDate)
    clockOut.setHours(checkOutHour, checkOutMin, 0, 0)

    const totalHours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60)

    // Determine status based on shift times
    const getMinutes = (date: Date) => date.getHours() * 60 + date.getMinutes()
    const checkInMinutes = checkInHour * 60 + checkInMin
    const checkOutMinutes = checkOutHour * 60 + checkOutMin
    const shiftStart = getMinutes(shift.startTime)
    const shiftEnd = getMinutes(shift.endTime)

    let status = 'on-time'
    if (checkInMinutes > shiftStart) status = 'late'
    if (checkOutMinutes < shiftEnd && status === 'on-time') status = 'early'

    const results = []

    for (const staffId of data.staffIds) {
      // Check if already exists
      const existing = await prisma.timekeeping.findFirst({
        where: {
          staffId,
          shiftId: data.shiftId,
          workDate
        }
      })

      if (existing) {
        // Update existing
        const updated = await prisma.timekeeping.update({
          where: { id: existing.id },
          data: {
            clockIn,
            clockOut,
            totalHours,
            status
          }
        })
        results.push(updated)
      } else {
        // Create new
        const created = await prisma.timekeeping.create({
          data: {
            staffId,
            shiftId: data.shiftId,
            workDate,
            clockIn,
            clockOut,
            totalHours,
            status
          }
        })
        results.push(created)
      }
    }

    return results
  }

  /**
   * Lấy tất cả chấm công (Admin)
   */
  async getAll(query: TimekeepingQueryDto) {
    const where: any = {}

    if (query.from || query.to) {
      where.workDate = {}
      if (query.from) where.workDate.gte = new Date(query.from)
      if (query.to) where.workDate.lte = new Date(query.to)
    }

    if (query.staffId) where.staffId = Number(query.staffId)
    if (query.shiftId) where.shiftId = Number(query.shiftId)

    return await prisma.timekeeping.findMany({
      where,
      include: {
        staff: { select: { id: true, fullName: true, code: true } },
        shift: true
      },
      orderBy: { workDate: 'desc' }
    })
  }

  /**
   * Cập nhật chấm công (Admin)
   */
  async update(id: number, data: UpdateTimekeepingDto) {
    const record = await prisma.timekeeping.findUnique({ where: { id } })
    if (!record) throw new NotFoundRequestError('Không tìm thấy bản ghi chấm công')

    const updateData: any = {}

    let newCheckIn = record.clockIn;
    let newCheckOut = record.clockOut;

    if (data.checkIn) {
      // Assuming HH:mm format
      const [h, m] = data.checkIn.split(':').map(Number)
      const clockIn = new Date(record.workDate)
      clockIn.setHours(h, m, 0, 0)
      updateData.clockIn = clockIn
      newCheckIn = clockIn;
    }

    if (data.checkOut) {
      const [h, m] = data.checkOut.split(':').map(Number)
      const clockOut = new Date(record.workDate)
      clockOut.setHours(h, m, 0, 0)
      updateData.clockOut = clockOut
      newCheckOut = clockOut;
    }
    
    // Recalculate total hours
    if (newCheckIn && newCheckOut) {
        const diffMs = newCheckOut.getTime() - newCheckIn.getTime();
        updateData.totalHours = (diffMs) / (1000 * 60 * 60);
        
        if (!data.status) {
            updateData.status = 'on-time'; 
        }
    }

    if (data.status) updateData.status = data.status
    if (data.notes !== undefined) updateData.notes = data.notes

    return await prisma.timekeeping.update({
      where: { id },
      data: updateData
    })
  }

  /**
   * Tạo chấm công thủ công (Admin)
   */
  async create(data: any) {
    const workDate = new Date(data.workDate)
    
    // Validate existence of staff and shift
    const shift = await prisma.shift.findUnique({ where: { id: data.shiftId } })
    if (!shift) throw new NotFoundRequestError('Ca làm việc không tồn tại')

    let clockIn = null
    let clockOut = null
    let totalHours = 0

    if (data.checkIn) {
      const [h, m] = data.checkIn.split(':').map(Number)
      clockIn = new Date(workDate)
      clockIn.setHours(h, m, 0, 0)
    }

    if (data.checkOut) {
      const [h, m] = data.checkOut.split(':').map(Number)
      clockOut = new Date(workDate)
      clockOut.setHours(h, m, 0, 0)
    }

    if (clockIn && clockOut) {
        totalHours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60)
    }

    // Default status logic if not provided
    let status = data.status || 'on-time'

    return await prisma.timekeeping.create({
      data: {
        staffId: data.staffId,
        shiftId: data.shiftId,
        workDate,
        clockIn,
        clockOut,
        totalHours,
        status,
        notes: data.notes
      }
    })
  }
  
  private formatTime(date: Date): string {
    return date.toTimeString().slice(0, 5)
  }
}

export const timekeepingService = new TimekeepingService()

