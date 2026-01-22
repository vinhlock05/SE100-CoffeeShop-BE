import { Router } from 'express'
import { statisticsController } from '~/controllers/statistics.controller'
import { endOfDayStatisticsValidation } from '~/middlewares/statistics/endOfDayStatistics.middleware'
import { wrapRequestHandler } from '~/utils/handler'
import { accessTokenValidation, requirePermission } from '~/middlewares/auth.middleware'
import { salesStatisticsValidation } from '~/middlewares/statistics/salesStatistics.middleware'
import { staffStatisticsValidation } from '~/middlewares/statistics/staffStatistics.middleware'

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

/**
 * @route   POST /api/reports/financial
 * @desc    Get financial report (revenue/profit/cost)
 * @access  Private (requires reports:view permission)
 * @body    { displayType, concern, startDate, endDate }
 */
router.post(
    '/financial',
    accessTokenValidation,
    requirePermission('reports:view'),
    wrapRequestHandler(statisticsController.getFinancialReport)
)

/**
 * @route   POST /api/reports/products
 * @desc    Get product statistics (report/chart with sales/profit concerns)
 * @access  Private (requires reports:view permission)
 * @body    { displayType, concern?, startDate, endDate, productSearch?, categoryIds? }
 */
router.post(
    '/products',
    accessTokenValidation,
    requirePermission('reports:view'),
    wrapRequestHandler(statisticsController.getProductStatistics)
)

/**
 * @route   GET /api/reports/staff
 * @desc    Get staff statistics (profit/sales by staff)
 * @access  Private (requires reports:view permission)
 * @query   { displayType, concern, startDate, endDate }
 */
router.get(
    '/staff',
    accessTokenValidation,
    requirePermission('reports:view'),
    staffStatisticsValidation,
    wrapRequestHandler(statisticsController.getStaffStatistics)
)


export default router

