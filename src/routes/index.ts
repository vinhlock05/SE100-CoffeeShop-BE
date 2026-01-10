import { Router } from 'express'
import authRouter from './auth.route'
import roleRouter from './role.route'
import userRouter from './user.route'
import staffRouter from './staff.route'
import shiftRouter from './shift.route'
import timekeepingRouter from './timekeeping.route'
import scheduleRouter from './schedule.route'
import payrollRouter from './payroll.route'
import categoryRouter from './category.route'
import unitRouter from './unit.route'
import inventoryItemRouter from './inventoryItem.route'
import supplierRouter from './supplier.route'
import purchaseOrderRouter from './purchaseOrder.route'
import writeOffRouter from './writeOff.route'
import stockCheckRouter from './stockCheck.route'
import pricingRouter from './pricing.route'
import areaRouter from './area.route'
import tableRouter from './table.route'
import uploadRouter from './upload.route'

const router = Router()

// Auth
router.use('/auth', authRouter)

// User Management
router.use('/roles', roleRouter)
router.use('/users', userRouter)
router.use('/staff', staffRouter)

// Staff Scheduling
router.use('/shifts', shiftRouter)
router.use('/timekeeping', timekeepingRouter)
router.use('/schedules', scheduleRouter)
router.use('/payrolls', payrollRouter)

// Inventory Management  
router.use('/areas', areaRouter)
router.use('/tables', tableRouter)

// Inventory Management  
router.use('/categories', categoryRouter)
router.use('/units', unitRouter)
router.use('/inventory-items', inventoryItemRouter)
router.use('/suppliers', supplierRouter)
router.use('/purchase-orders', purchaseOrderRouter)
router.use('/write-offs', writeOffRouter)
router.use('/stock-checks', stockCheckRouter)
router.use('/pricing', pricingRouter)

// Upload
router.use('/upload', uploadRouter)

export default router


