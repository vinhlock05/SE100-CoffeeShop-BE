import { Request, Response } from 'express'
import { statisticsService } from '~/services/statistics.service'
import { SuccessResponse } from '~/core/success.response'
import { StatisticsConcern } from '~/enums'

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
}

export const statisticsController = new StatisticsController()
