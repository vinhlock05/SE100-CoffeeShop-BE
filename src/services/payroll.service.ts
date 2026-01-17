
import { prisma } from '~/config/database'
import { BadRequestError, NotFoundRequestError } from '~/core/error.response'
import { CreatePayrollDto, PayrollQueryDto, UpdatePayslipDto, PayrollPaymentDto } from '~/dtos/payroll'
import { financeService } from './finance.service'

export class PayrollService {
  /**
   * Create Payroll Period and Generate Payslips
   */
  async createPayroll(dto: CreatePayrollDto, userId: number) {
      const start = new Date(dto.year, dto.month - 1, 1)
      const end = new Date(dto.year, dto.month, 0)
      const code = `PR${dto.year}${String(dto.month).padStart(2, '0')}`

      // Check existing
      const existing = await prisma.payroll.findUnique({ where: { code } })
      if (existing) {
          throw new BadRequestError({ message: 'Payroll for this month already exists' })
      }

      return await prisma.$transaction(async (tx) => {
          // 1. Create Payroll Header
          const payroll = await tx.payroll.create({
              data: {
                  code,
                  periodStart: start,
                  periodEnd: end,
                  status: 'draft',
                  createdBy: userId
              }
          })

          // 2. Scan Staffs
          const staffs = await tx.staff.findMany({
              where: { status: 'active' },
              include: { salarySetting: true }
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
                      workDate: { gte: start, lte: end }
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
              } else {
                  if (workDays > 0) {
                      totalSalary = baseSalary
                  }
              }

              if (totalSalary > 0) {
                  await tx.payslip.create({
                      data: {
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
                      payments: true
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
              payments: true
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
          await tx.payrollPayment.update({
              where: { id: payment.id },
              data: { financeTransactionId: financeTransaction.id }
          })

          return payment
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
}

export const payrollService = new PayrollService()

