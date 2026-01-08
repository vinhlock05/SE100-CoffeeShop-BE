import { Router } from 'express'
import authRouter from './auth.route'
import roleRouter from './role.route'
import userRouter from './user.route'
import staffRouter from './staff.route'

const router = Router()

router.use('/auth', authRouter)
router.use('/roles', roleRouter)
router.use('/users', userRouter)
router.use('/staff', staffRouter)

export default router
