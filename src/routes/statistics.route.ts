import { Router } from 'express'
import { statisticsController } from '~/controllers/statistics.controller'
import { endOfDayStatisticsValidation } from '~/middlewares/statistics/endOfDayStatistics.middleware'
import { wrapRequestHandler } from '~/utils/handler'
import { accessTokenValidation, requirePermission } from '~/middlewares/auth.middleware'
import { salesStatisticsValidation } from '~/middlewares/statistics/salesStatistics.middleware'

const router = Router()

/**
 * @route   POST /api/reports/end-of-day
 * @desc    Get end-of-day report based on concern type
 * @access  Private (requires reports:view permission)
 * @body    { concern, startDate, endDate, ...filters }
 */
router.post(
    '/end-of-day',
    accessTokenValidation,
    requirePermission('reports:view'),
    endOfDayStatisticsValidation,
    wrapRequestHandler(statisticsController.getEndOfDayReport)
)

/**
 * @route   POST /api/reports
 * @desc    Get sales statistics based on concern type
 * @access  Private (requires reports:view permission)
 * @body    { concern, startDate, endDate, displayType?, areaIds?, tableIds? }
 */
router.post(
    '/sales',
    accessTokenValidation,
    requirePermission('reports:view'),
    salesStatisticsValidation,
    wrapRequestHandler(statisticsController.getSalesReport)
)


export default router

