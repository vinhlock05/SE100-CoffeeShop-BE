import { Request, Response } from 'express'
import { statisticsService } from '~/services/statistics/endOfDayStatistics.service'
import { SuccessResponse } from '~/core/success.response'
import { SalesStatisticsConcern, StatisticsConcern } from '~/enums'
import { salesStatisticsService } from '~/services/statistics/salesStatistics.service'
import { financialStatisticsService } from '~/services/statistics/financialStatistics.service'
import { productStatisticsService } from '~/services/statistics/productStatistics.service'
import staffStatisticsService from '~/services/statistics/staffStatistics.service'

class StatisticsController {
    async getEndOfDayReport(req: Request, res: Response) {
        const { concern, ...filters } = req.body

        let result

        switch (concern) {
            case StatisticsConcern.SALES:
                result = await statisticsService.getSalesStatistics(req.body)
                break

            case StatisticsConcern.REVENUE_EXPENSES:
                result = await statisticsService.getRevenueExpensesStatistics(req.body)
                break

            case StatisticsConcern.INVENTORY:
                result = await statisticsService.getInventoryStatistics(req.body)
                break

            case StatisticsConcern.CANCELLED_ITEMS:
                result = await statisticsService.getCancelledItemsStatistics(req.body)
                break

            default:
                throw new Error('Invalid concern type')
        }

        new SuccessResponse({
            message: 'End of day report retrieved successfully',
            metaData: result
        }).send(res)
    }

    async getSalesReport(req: Request, res: Response) {
        const { concern } = req.body

        let result

        switch (concern) {
            case SalesStatisticsConcern.TIME:
                result = await salesStatisticsService.getTimeStatistics(req.body)
                break

            case SalesStatisticsConcern.PROFIT:
                result = await salesStatisticsService.getProfitStatistics(req.body)
                break

            case SalesStatisticsConcern.INVOICE_DISCOUNT:
                result = await salesStatisticsService.getInvoiceDiscountStatistics(req.body)
                break

            case SalesStatisticsConcern.RETURNS:
                result = await salesStatisticsService.getReturnsStatistics(req.body)
                break

            case SalesStatisticsConcern.TABLES:
                result = await salesStatisticsService.getTableStatistics(req.body)
                break

            case SalesStatisticsConcern.CATEGORIES:
                result = await salesStatisticsService.getCategoryStatistics(req.body)
                break

            default:
                throw new Error('Invalid concern type')
        }

        new SuccessResponse({
            message: 'Sales statistics retrieved successfully',
            metaData: result
        }).send(res)
    }

    async getFinancialReport(req: Request, res: Response) {
        const { displayType, concern } = req.body

        let result

        if (displayType === 'report') {
            // Report mode: Unified report
            result = await financialStatisticsService.getUnifiedReport(req.body)
        } else if (displayType === 'chart') {
            // Chart mode: Unified chart data
            result = await financialStatisticsService.getUnifiedChart(req.body)
        } else {
            throw new Error('Invalid display type')
        }

        new SuccessResponse({
            message: 'Financial report retrieved successfully',
            metaData: result
        }).send(res)
    }

    async getProductStatistics(req: Request, res: Response) {
        const { displayType, concern } = req.body

        let result

        if (displayType === 'report') {
            result = await productStatisticsService.getProductReport(req.body)
        } else if (displayType === 'chart') {
            if (concern === 'sales') {
                result = await productStatisticsService.getSalesChart(req.body)
            } else if (concern === 'profit') {
                result = await productStatisticsService.getProfitChart(req.body)
            } else {
                throw new Error('Invalid concern for chart mode')
            }
        } else {
            throw new Error('Invalid display type')
        }

        new SuccessResponse({
            message: 'Product statistics retrieved successfully',
            metaData: result
        }).send(res)
    }

    async getStaffStatistics(req: Request, res: Response) {
        const { displayType, concern, startDate, endDate } = req.query

        const start = new Date(startDate as string)
        const end = new Date(endDate as string)
        start.setHours(0, 0, 0, 0)
        end.setHours(23, 59, 59, 999)

        let result

        if (displayType === 'report') {
            if (concern === 'profit') {
                result = await staffStatisticsService.getProfitReport(start, end)
            } else if (concern === 'sales') {
                result = await staffStatisticsService.getSalesReport(start, end)
            } else {
                throw new Error('Invalid concern for report mode')
            }
        } else if (displayType === 'chart') {
            if (concern === 'profit') {
                result = await staffStatisticsService.getProfitChart(start, end)
            } else if (concern === 'sales') {
                result = await staffStatisticsService.getSalesChart(start, end)
            } else {
                throw new Error('Invalid concern for chart mode')
            }
        } else {
            throw new Error('Invalid display type')
        }

        new SuccessResponse({
            message: 'Staff statistics retrieved successfully',
            metaData: result
        }).send(res)
    }
}

export const statisticsController = new StatisticsController()
