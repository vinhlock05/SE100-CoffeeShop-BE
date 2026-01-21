import { prisma } from '~/config/database'
import { CreateShiftDto, UpdateShiftDto } from '~/dtos/shift'
import { BadRequestError, NotFoundRequestError } from '~/core/error.response'

class ShiftService {
  async create(data: CreateShiftDto) {
    // Validate time logic
    this.validateTime(data.startTime, data.endTime)
    await this.validateName(data.name)
    
    // Create new shift (Prisma will handle DateTime conversion with @db.Time)
    // Note: Prisma expects ISO-8601 DateTime strings for Time type, but we pass "HH:MM".
    // We need to append a dummy date "1970-01-01T" to make it compatible if not handled automatically.
    // However, with @db.Time(), Prisma usually handles Date object -> Time column.
    // Let's convert string "HH:MM" to Date object.
    
    return await prisma.shift.create({
      data: {
        name: data.name,
        startTime: this.toDateTime(data.startTime),
        endTime: this.toDateTime(data.endTime),
        checkInTime: this.toDateTime(data.checkInTime),
        checkOutTime: this.toDateTime(data.checkOutTime),
        isActive: data.isActive ?? true
      }
    })
  }

  async findAll(isActive?: boolean) {
    const whereCondition = isActive !== undefined ? { isActive } : {}
    const shifts = await prisma.shift.findMany({
      where: whereCondition,
      orderBy: { startTime: 'asc' } // Sắp xếp theo giờ bắt đầu
    })
    
    // Convert Date objects back to "HH:MM" string for response if needed, 
    // or let frontend handle ISO string. Typically BE returns ISO.
    // Let's return as is.
    return shifts
  }

  async findById(id: number) {
    const shift = await prisma.shift.findUnique({ where: { id } })
    if (!shift) throw new NotFoundRequestError('Ca làm việc không tồn tại')
    return shift
  }

  async update(id: number, data: UpdateShiftDto) {
    const shift = await this.findById(id)

    if (data.name && data.name !== shift.name) {
        await this.validateName(data.name, id)
    }

    // Validate time if updated
    const startTime = data.startTime || this.toTimeString(shift.startTime)
    const endTime = data.endTime || this.toTimeString(shift.endTime)
    
    if (data.startTime || data.endTime) {
      this.validateTime(startTime, endTime)
    }

    return await prisma.shift.update({
      where: { id },
      data: {
        name: data.name,
        startTime: data.startTime ? this.toDateTime(data.startTime) : undefined,
        endTime: data.endTime ? this.toDateTime(data.endTime) : undefined,
        checkInTime: data.checkInTime ? this.toDateTime(data.checkInTime) : undefined,
        checkOutTime: data.checkOutTime ? this.toDateTime(data.checkOutTime) : undefined,
        isActive: data.isActive
      }
    })
  }

  async delete(id: number) {
    await this.findById(id)
    // Check constraint: cannot delete if used in Schedule or Timekeeping
    // Prisma will throw error if foreign key constraint fails
    // Or we can manually check
    return await prisma.shift.delete({ where: { id } })
  }

  async toggleActive(id: number) {
    const shift = await this.findById(id)
    return await prisma.shift.update({
      where: { id },
      data: { isActive: !shift.isActive }
    })
  }

  // --- Helpers ---

  private toDateTime(timeStr: string): Date {
    // Convert "HH:MM" to Date object (using today's date or dummy date)
    const [hours, minutes] = timeStr.split(':').map(Number)
    const date = new Date()
    date.setHours(hours, minutes, 0, 0)
    return date
  }

  private toTimeString(date: Date): string {
    return date.toTimeString().slice(0, 5) // "HH:MM"
  }

  private validateTime(start: string, end: string) {
    // Simple validation: start != end. 
    // Cross-day shift (e.g. 22:00 -> 02:00) is allowed logic-wise, 
    // but calculation depends on business rule.
    // For now just ensure format valid (handled by DTO)
    if (start === end) {
      throw new BadRequestError({ message: 'Giờ bắt đầu và kết thúc không được trùng nhau' })
    }
  }

  private async validateName(name: string, excludeId?: number) {
    const existing = await prisma.shift.findFirst({
        where: {
            name,
            id: excludeId ? { not: excludeId } : undefined
        }
    })
    if (existing) {
        throw new BadRequestError({ message: 'Tên ca làm việc đã tồn tại' })
    }
  }
}

export const shiftService = new ShiftService()
