import { Request, Response } from 'express'
import { salesStatisticsService } from '~/services/salesStatistics.service'
import { SuccessResponse } from '~/core/success.response'
import { SalesStatisticsConcern } from '~/enums'

class SalesStatisticsController {
    async getSalesStatistics(req: Request, res: Response) {
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
}

export const salesStatisticsController = new SalesStatisticsController()
