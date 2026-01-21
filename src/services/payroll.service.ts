
import { prisma } from '~/config/database'
import { BadRequestError, NotFoundRequestError } from '~/core/error.response'
import { CreatePayrollDto, PayrollQueryDto, UpdatePayslipDto, PayrollPaymentDto } from '~/dtos/payroll'
import { financeService } from './finance.service'
import { generateCode } from '~/utils/helpers'
import ExcelJS from 'exceljs'

export class PayrollService {
  /**
   * Create Payroll Period and Generate Payslips
   */
  async createPayroll(dto: CreatePayrollDto, createdBy?: number) {
      const start = new Date(dto.year, dto.month - 1, 1)
      const end = new Date(dto.year, dto.month, 0)
      
      // Check existing
      const existing = await prisma.payroll.findFirst({
        where: {
            periodStart: start,
            periodEnd: end
        }
      })
      if (existing) {
          throw new BadRequestError({ message: `Bảng lương tháng ${dto.month}/${dto.year} đã tồn tại` })
      }

      // Get all active staff
      const staffs = await prisma.staff.findMany({
          where: { status: 'active', deletedAt: null },
          include: { salarySetting: true }
      })

      return await prisma.$transaction(async (tx) => {
          // 1. Create Payroll Header with temp code
          const tempCode = `temp_${Date.now()}`
          const name = `Bảng lương Tháng ${dto.month}/${dto.year}`

          let payroll = await tx.payroll.create({
              data: {
                  code: tempCode,
                  name,
                  periodStart: start,
                  periodEnd: end,
                  status: 'draft',
                  createdBy: createdBy
              }
          })

          // Update real code BLxxxx
          payroll = await tx.payroll.update({
              where: { id: payroll.id },
              data: { code: generateCode('BL', payroll.id) }
          })

          let totalAmount = 0

          // 3. Generate Payslip for each staff
          for (const staff of staffs) {
              const salarySetting = staff.salarySetting
              if (!salarySetting) continue;

              const currentSalary = salarySetting

              const stats = await tx.timekeeping.aggregate({
                  where: {
                      staffId: staff.id,
                      workDate: { gte: start, lte: end },
                      status: { in: ['on-time', 'late-early'] }
                  },
                  _sum: { totalHours: true },
                  _count: { id: true }
              })

              const workDays = stats._count.id
              const totalHours = Number(stats._sum.totalHours || 0)
              
              let totalSalary = 0
              const baseSalary = Number(currentSalary.baseRate)

              if (currentSalary.salaryType === 'hourly') {
                  totalSalary = baseSalary * totalHours
              } else if (currentSalary.salaryType === 'shift') {
                  totalSalary = baseSalary * workDays
              } else {
                  // Fixed/Monthly
                  totalSalary = baseSalary
              }

              if (totalSalary > 0) {
                  const tempPayslipCode = `temp_pl_${Date.now()}_${staff.id}`
                  let payslip = await tx.payslip.create({
                      data: {
                          code: tempPayslipCode,
                          payrollId: payroll.id,
                          staffId: staff.id,
                          baseSalary: baseSalary,
                          totalSalary: totalSalary,
                          workDays: workDays,
                          bonus: 0,
                          penalty: 0,
                          paidAmount: 0
                      }
                  })
                  
                  // Update real code PLxxxx
                  await tx.payslip.update({
                      where: { id: payslip.id },
                      data: { code: generateCode('PL', payslip.id) }
                  })

                  totalAmount += totalSalary
              }
          }

          await tx.payroll.update({
              where: { id: payroll.id },
              data: { totalAmount }
          })

          return payroll
      })
  }

  /**
   * Get Payrolls
   */
  async getPayrolls(query: PayrollQueryDto) {
      const where: any = {}
      if (query.month && query.year) {
          const code = `PR${query.year}${String(query.month).padStart(2, '0')}`
          where.code = code
      }

      return await prisma.payroll.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          include: { 
              _count: { select: { payslips: true } },
              payslips: {
                  include: {
                      staff: { select: { id: true, fullName: true, code: true, position: true } },
                      payments: {
                        include: {
                          financeTransaction: { select: { code: true } }
                        }
                      }
                  }
              }
          }
      })
  }

  /**
   * Get Payslips detail for a Payroll
   */
  async getPayslips(payrollId: number) {
      const payroll = await prisma.payroll.findUnique({ where: { id: payrollId } })
      if (!payroll) throw new NotFoundRequestError('Payroll not found')
      
      return await prisma.payslip.findMany({
          where: { payrollId },
          include: {
              staff: { select: { id: true, fullName: true, code: true, position: true } },
              payments: {
                include: {
                  financeTransaction: { select: { code: true } }
                }
              }
          }
      })
  }

  /**
   * Update payslip (bonus/penalty)
   */
  async updatePayslip(payrollId: number, staffId: number, data: UpdatePayslipDto) {
      const payslip = await prisma.payslip.findFirst({
          where: { payrollId, staffId }
      })
      if (!payslip) throw new NotFoundRequestError('Payslip not found')

      const bonus = data.bonus ?? Number(payslip.bonus)
      const penalty = data.penalty ?? Number(payslip.penalty)
      const baseSalary = Number(payslip.baseSalary)

      // Recalculate total salary
      const totalSalary = baseSalary + bonus - penalty

      return await prisma.payslip.update({
          where: { id: payslip.id },
          data: {
              bonus,
              penalty,
              totalSalary,
              notes: data.notes ?? payslip.notes
          }
      })
  }

  /**
   * Add payment to payslip
   */
  async addPayment(payrollId: number, dto: PayrollPaymentDto, createdBy: number) {
      const payslip = await prisma.payslip.findFirst({
          where: { payrollId, staffId: dto.staffId }
      })
      if (!payslip) throw new NotFoundRequestError('Payslip not found')

      return await prisma.$transaction(async (tx) => {
          // Create payment record
          const payment = await tx.payrollPayment.create({
              data: {
                  payslipId: payslip.id,
                  amount: dto.amount,
                  method: dto.method,
                  bankName: dto.bankName,
                  bankAccount: dto.bankAccount,
                  note: dto.note,
                  createdBy
              }
          })

          // Update paid amount on payslip
          const newPaidAmount = Number(payslip.paidAmount) + dto.amount
          await tx.payslip.update({
              where: { id: payslip.id },
              data: { paidAmount: newPaidAmount }
          })

          // Get staff info and payroll for finance transaction
          const staffInfo = await tx.staff.findUnique({
              where: { id: dto.staffId },
              select: { fullName: true, phone: true }
          })
          const payroll = await tx.payroll.findUnique({
              where: { id: payrollId },
              select: { code: true }
          })

          // Create finance transaction (Chi - Expense) for salary payment
          // Category ID 7 = 'Tiền lương' (Salary Payment)
          const financeTransaction = await financeService.createTransaction({
              categoryId: 7, // Tiền lương
              amount: dto.amount,
              paymentMethod: dto.method === 'transfer' ? 'bank' : 'cash',
              personType: 'staff',
              personId: dto.staffId,
              personName: staffInfo?.fullName,
              personPhone: staffInfo?.phone || undefined,
              notes: `Chi lương ${payroll?.code} - ${staffInfo?.fullName}`,
              referenceType: 'payroll',
              referenceId: payrollId
          }, createdBy, tx)

          // Link finance transaction to payment
          const updatedPayment = await tx.payrollPayment.update({
              where: { id: payment.id },
              data: { financeTransactionId: financeTransaction.id },
              include: {
                  financeTransaction: { select: { code: true } }
              }
          })

          return updatedPayment
      })
  }

  /**
   * Finalize payroll
   */
  async finalize(payrollId: number) {
      const payroll = await prisma.payroll.findUnique({ where: { id: payrollId } })
      if (!payroll) throw new NotFoundRequestError('Payroll not found')

      if (payroll.status === 'finalized') {
          throw new BadRequestError({ message: 'Bảng lương đã được chốt' })
      }

      // Recalculate total amount from payslips
      const payslips = await prisma.payslip.findMany({ where: { payrollId } })
      const totalAmount = payslips.reduce((sum, p) => sum + Number(p.totalSalary), 0)

      return await prisma.payroll.update({
          where: { id: payrollId },
          data: {
              status: 'finalized',
              finalizedAt: new Date(),
              totalAmount
          }
      })
  }

  async reloadPayroll(id: number) {
      const payroll = await prisma.payroll.findUnique({ where: { id } })
      if (!payroll) throw new NotFoundRequestError('Payroll not found')
      if (payroll.status !== 'draft') throw new BadRequestError({ message: 'Only draft payroll can be reloaded' })

      return await prisma.$transaction(async (tx) => {
          await tx.payslip.deleteMany({ where: { payrollId: id } })
          
          const start = payroll.periodStart
          const end = payroll.periodEnd
          
          const staffs = await tx.staff.findMany({
              where: { status: 'active' },
              include: { salarySetting: true }
          })
          
          let totalAmount = 0
          
          for (const staff of staffs) {
              const salarySetting = staff.salarySetting
              if (!salarySetting) continue;
              
              const stats = await tx.timekeeping.aggregate({
                  where: {
                      staffId: staff.id,
                      workDate: { gte: start, lte: end },
                      status: { in: ['on-time', 'late-early'] }
                  },
                  _sum: { totalHours: true },
                  _count: { id: true }
              })

              const workDays = stats._count.id
              const totalHours = Number(stats._sum.totalHours || 0)
              const baseSalary = Number(salarySetting.baseRate)
              
              let totalSalary = 0
              if (salarySetting.salaryType === 'hourly') {
                  totalSalary = baseSalary * totalHours
              } else if (salarySetting.salaryType === 'shift') {
                  totalSalary = baseSalary * workDays
              } else {
                  totalSalary = baseSalary
              }
              
              if (totalSalary > 0) {
                  const tempCode = `temp_pl_${Date.now()}_${staff.id}`
                  const p = await tx.payslip.create({
                      data: {
                          code: tempCode,
                          payrollId: id,
                          staffId: staff.id,
                          baseSalary,
                          totalSalary,
                          workDays,
                          bonus: 0,
                          penalty: 0,
                          paidAmount: 0
                      }
                  })

                   await tx.payslip.update({
                      where: { id: p.id },
                      data: { code: generateCode('PL', p.id) }
                   })
                   
                  totalAmount += totalSalary
              }
          }
          
          await tx.payroll.update({ where: { id }, data: { totalAmount } })
          
          return await tx.payroll.findUnique({ 
              where: { id },
              include: { 
                 _count: { select: { payslips: true } },
                 payslips: { include: { staff: true, payments: true } }
              }
          })
      })
  }

  async exportPayroll(id: number) {
      const payroll = await prisma.payroll.findUnique({
          where: { id },
          include: {
              payslips: {
                  include: { staff: true }
              }
          }
      })
      if (!payroll) throw new NotFoundRequestError('Payroll not found')

      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('Bang Luong')

      worksheet.columns = [
          { header: 'Mã NV', key: 'code', width: 15 },
          { header: 'Họ tên', key: 'name', width: 25 },
          { header: 'Chức vụ', key: 'position', width: 15 },
          { header: 'Lương cơ bản', key: 'base', width: 15 },
          { header: 'Thưởng', key: 'bonus', width: 15 },
          { header: 'Phạt', key: 'penalty', width: 15 },
          { header: 'Tổng lương', key: 'total', width: 15 },
          { header: 'Đã trả', key: 'paid', width: 15 },
          { header: 'Còn lại', key: 'remaining', width: 15 },
      ]

      payroll.payslips.forEach(p => {
          worksheet.addRow({
              code: p.staff?.code || p.staffId,
              name: p.staff?.fullName,
              position: p.staff?.position,
              base: Number(p.baseSalary),
              bonus: Number(p.bonus),
              penalty: Number(p.penalty),
              total: Number(p.totalSalary),
              paid: Number(p.paidAmount),
              remaining: Number(p.totalSalary) - Number(p.paidAmount)
          })
      })

      return await workbook.xlsx.writeBuffer()
  }

  async deletePayroll(id: number) {
      const payroll = await prisma.payroll.findUnique({ where: { id }, include: { payslips: true } })
      if (!payroll) throw new NotFoundRequestError('Payroll not found')
      
      await prisma.$transaction(async (tx) => {
          const payslipIds = payroll.payslips.map(p => p.id)
          const payments = await tx.payrollPayment.findMany({
              where: { payslipId: { in: payslipIds } }
          })
          
          for (const payment of payments) {
              if (payment.financeTransactionId) {
                  await tx.financeTransaction.delete({ where: { id: payment.financeTransactionId } }).catch(() => {})
              }
          }

          await tx.payrollPayment.deleteMany({ where: { payslipId: { in: payslipIds } } })
          await tx.payslip.deleteMany({ where: { payrollId: id } })
          await tx.payroll.delete({ where: { id } })
      })
      
      return true
  }
}

export const payrollService = new PayrollService()

