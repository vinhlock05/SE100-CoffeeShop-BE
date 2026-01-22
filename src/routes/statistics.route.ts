import { Router } from 'express'
import { statisticsController } from '~/controllers/statistics.controller'
import { endOfDayStatisticsValidation } from '~/middlewares/statistics/endOfDayStatistics.middleware'
import { wrapRequestHandler } from '~/utils/handler'
import { accessTokenValidation, requirePermission } from '~/middlewares/auth.middleware'
import { salesStatisticsValidation } from '~/middlewares/statistics/salesStatistics.middleware'
import { staffStatisticsValidation } from '~/middlewares/statistics/staffStatistics.middleware'
import { customerStatisticsValidation } from '~/middlewares/statistics/customerStatistics.middleware'
import { supplierStatisticsValidation } from '~/middlewares/statistics/supplierStatistics.middleware'

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

/**
 * @route   GET /api/reports/customers
 * @desc    Get customer statistics (report/chart)
 * @access  Private (requires reports:view permission)
 * @query   { displayType, startDate, endDate, customerGroupIds?, search? }
 */
router.get(
    '/customer',
    accessTokenValidation,
    requirePermission('reports:view'),
    customerStatisticsValidation,
    wrapRequestHandler(statisticsController.getCustomerStatistics)
)

/**
 * @route   GET /api/reports/suppliers
 * @desc    Get supplier statistics (purchasing/debt)
 * @access  Private (requires reports:view permission)
 * @query   { displayType, concern, startDate, endDate, search? }
 */
router.get(
    '/suppliers',
    accessTokenValidation,
    requirePermission('reports:view'),
    supplierStatisticsValidation,
    wrapRequestHandler(statisticsController.getSupplierStatistics)
)


export default router

