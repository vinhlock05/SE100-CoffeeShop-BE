import { Router } from 'express'
import { statisticsController } from '~/controllers/statistics.controller'
import { endOfDayStatisticsValidation } from '~/middlewares/statistics/endOfDayStatistics.middleware'
import { wrapRequestHandler } from '~/utils/handler'
import { accessTokenValidation, requirePermission } from '~/middlewares/auth.middleware'

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

export default router

