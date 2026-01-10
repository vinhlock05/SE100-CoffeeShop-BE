
import { Router } from 'express'
import { payrollController } from '~/controllers/payroll.controller'
import { CreatePayrollDto, PayrollQueryDto, UpdatePayslipDto, PayrollPaymentDto } from '~/dtos/payroll'
import { dtoValidation } from '~/middlewares/dtoValidation.middleware'
import { wrapRequestHandler } from '~/utils/handler'
import { accessTokenValidation, requirePermission } from '~/middlewares/auth.middleware'

const payrollRouter = Router()

payrollRouter.use(accessTokenValidation)

/**
 * @route   POST /api/payrolls
 * @desc    Tạo bảng lương tháng
 * @access  Private (staff_payroll:create)
 */
payrollRouter.post(
  '/',
  requirePermission('staff_payroll:create'),
  dtoValidation(CreatePayrollDto),
  wrapRequestHandler(payrollController.create)
)

/**
 * @route   GET /api/payrolls
 * @desc    Lấy danh sách bảng lương
 * @access  Private (staff_payroll:view)
 */
payrollRouter.get(
  '/',
  requirePermission('staff_payroll:view'),
  wrapRequestHandler(payrollController.getAll)
)

/**
 * @route   GET /api/payrolls/:id
 * @desc    Lấy chi tiết (danh sách phiếu lương)
 * @access  Private (staff_payroll:view)
 */
payrollRouter.get(
  '/:id',
  requirePermission('staff_payroll:view'),
  wrapRequestHandler(payrollController.getPayslips)
)

/**
 * @route   PATCH /api/payrolls/:id/payslips/:staffId
 * @desc    Cập nhật phiếu lương (bonus/penalty)
 * @access  Private (staff_payroll:update)
 */
payrollRouter.patch(
  '/:id/payslips/:staffId',
  requirePermission('staff_payroll:update'),
  dtoValidation(UpdatePayslipDto),
  wrapRequestHandler(payrollController.updatePayslip)
)

/**
 * @route   POST /api/payrolls/:id/payment
 * @desc    Thanh toán lương
 * @access  Private (staff_payroll:update)
 */
payrollRouter.post(
  '/:id/payment',
  requirePermission('staff_payroll:update'),
  dtoValidation(PayrollPaymentDto),
  wrapRequestHandler(payrollController.addPayment)
)

/**
 * @route   PATCH /api/payrolls/:id/finalize
 * @desc    Chốt bảng lương
 * @access  Private (staff_payroll:update)
 */
payrollRouter.patch(
  '/:id/finalize',
  requirePermission('staff_payroll:update'),
  wrapRequestHandler(payrollController.finalize)
)

export default payrollRouter

