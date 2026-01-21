import { Router } from 'express'
import { salesStatisticsController } from '~/controllers/salesStatistics.controller'
import { salesStatisticsValidation } from '~/middlewares/statistics/salesStatistics.middleware'
import { wrapRequestHandler } from '~/utils/handler'
import { accessTokenValidation, requirePermission } from '~/middlewares/auth.middleware'

const router = Router()

/**
 * @route   POST /api/reports/sales
 * @desc    Get sales statistics based on concern type
 * @access  Private (requires reports:view permission)
 * @body    { concern, startDate, endDate, displayType?, areaIds?, tableIds? }
 */
router.post(
    '/',
    accessTokenValidation,
    requirePermission('reports:view'),
    salesStatisticsValidation,
    wrapRequestHandler(salesStatisticsController.getSalesStatistics)
)

export default router
