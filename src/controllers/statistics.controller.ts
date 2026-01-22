import { Request, Response } from 'express'
import { statisticsService } from '~/services/statistics/endOfDayStatistics.service'
import { SuccessResponse } from '~/core/success.response'
import { SalesStatisticsConcern, StatisticsConcern } from '~/enums'
import { salesStatisticsService } from '~/services/statistics/salesStatistics.service'

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

    async getDashboardSummary(req: Request, res: Response) {
        const result = await salesStatisticsService.getDashboardSummary()
        
        new SuccessResponse({
            message: 'Dashboard summary retrieved successfully',
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

            case SalesStatisticsConcern.PRODUCTS:
                result = await salesStatisticsService.getProductStatistics(req.body)
                break

            default:
                throw new Error('Invalid concern type')
        }

        new SuccessResponse({
            message: 'Sales statistics retrieved successfully',
            metaData: result
        }).send(res)
    }
}

export const statisticsController = new StatisticsController()
