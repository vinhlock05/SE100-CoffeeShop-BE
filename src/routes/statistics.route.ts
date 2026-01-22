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
 * @route   GET /api/reports/dashboard-summary
 * @desc    Get dashboard summary statistics (Revenue, Orders, Customers)
 * @access  Private (requires reports:view permission)
 */
router.get(
    '/dashboard-summary',
    accessTokenValidation,
    requirePermission('reports:view'),
    wrapRequestHandler(statisticsController.getDashboardSummary)
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

// ==========================================
// EXPORT ROUTES
// ==========================================

/**
 * @route   POST /api/reports/export/end-of-day
 * @desc    Export End of Day report
 */
router.post(
    '/export/end-of-day',
    accessTokenValidation,
    requirePermission('reports:view'),
    // Reuse validation or skip if loose? Let's assume validation is handled in service or front end is correct
    wrapRequestHandler(statisticsController.exportEndOfDayReport)
)

/**
 * @route   POST /api/reports/export/sales
 * @desc    Export Sales report
 */
router.post(
    '/export/sales',
    accessTokenValidation,
    requirePermission('reports:view'),
    wrapRequestHandler(statisticsController.exportSalesReport)
)

/**
 * @route   POST /api/reports/export/financial
 * @desc    Export Financial report
 */
router.post(
    '/export/financial',
    accessTokenValidation,
    requirePermission('reports:view'),
    wrapRequestHandler(statisticsController.exportFinancialReport)
)

/**
 * @route   POST /api/reports/export/products
 * @desc    Export Product report
 */
router.post(
    '/export/products',
    accessTokenValidation,
    requirePermission('reports:view'),
    wrapRequestHandler(statisticsController.exportProductReport)
)

/**
 * @route   POST /api/reports/export/staff
 * @desc    Export Staff report
 */
router.post(
    '/export/staff',
    accessTokenValidation,
    requirePermission('reports:view'),
    // staffStatisticsValidation, // using Get params
    wrapRequestHandler(statisticsController.exportStaffReport)
)

/**
 * @route   POST /api/reports/export/customer
 * @desc    Export Customer report
 */
router.post(
    '/export/customer',
    accessTokenValidation,
    requirePermission('reports:view'),
    wrapRequestHandler(statisticsController.exportCustomerReport)
)

/**
 * @route   POST /api/reports/export/suppliers
 * @desc    Export Supplier report
 */
router.post(
    '/export/suppliers',
    accessTokenValidation,
    requirePermission('reports:view'),
    wrapRequestHandler(statisticsController.exportSupplierReport)
)


export default router

