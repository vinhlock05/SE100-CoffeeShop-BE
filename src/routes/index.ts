import { Router } from 'express'
import authRouter from './auth.route'
import roleRouter from './role.route'
import userRouter from './user.route'
import staffRouter from './staff.route'
import categoryRouter from './category.route'
import unitRouter from './unit.route'
import inventoryItemRouter from './inventoryItem.route'
import supplierRouter from './supplier.route'
import purchaseOrderRouter from './purchaseOrder.route'
import writeOffRouter from './writeOff.route'
import stockCheckRouter from './stockCheck.route'
import pricingRouter from './pricing.route'

const router = Router()

// Auth
router.use('/auth', authRouter)

// User Management
router.use('/roles', roleRouter)
router.use('/users', userRouter)
router.use('/staff', staffRouter)

// Inventory Management  
router.use('/categories', categoryRouter)
router.use('/units', unitRouter)
router.use('/inventory-items', inventoryItemRouter)
router.use('/suppliers', supplierRouter)
router.use('/purchase-orders', purchaseOrderRouter)
router.use('/write-offs', writeOffRouter)
router.use('/stock-checks', stockCheckRouter)
router.use('/pricing', pricingRouter)

export default router

