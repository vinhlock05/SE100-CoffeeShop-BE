import { prisma } from '~/config/database'
import { Prisma } from '@prisma/client'
import { OrderItemStatus } from '~/enums/order.enum'

class ProductStatisticsService {
    // ==========================================
    // HELPER METHODS
    // ==========================================

    /**
     * Build where clause for order items based on filters
     */
    private buildOrderItemWhereClause(dto: any): Prisma.OrderItemWhereInput {
        const startDate = new Date(dto.startDate)
        const endDate = new Date(dto.endDate)

        startDate.setHours(0, 0, 0, 0)
        endDate.setHours(23, 59, 59, 999)

        const where: Prisma.OrderItemWhereInput = {
            order: {
                completedAt: { gte: startDate, lte: endDate },
                paymentStatus: 'paid'
            }
        }

        // Build item filter
        const itemWhere: any = {}

        // Product search (name or code)
        if (dto.productSearch) {
            itemWhere.OR = [
                { name: { contains: dto.productSearch, mode: 'insensitive' } },
                { code: { contains: dto.productSearch, mode: 'insensitive' } }
            ]
        }

        // Category filter
        if (dto.categoryIds && dto.categoryIds.length > 0) {
            itemWhere.categoryId = { in: dto.categoryIds }
        }

        // Apply item filter if any
        if (Object.keys(itemWhere).length > 0) {
            where.item = itemWhere
        }

        return where
    }

    /**
     * Determine time grouping unit based on date range
     */
    private determineTimeGrouping(startDate: Date, endDate: Date): 'hour' | 'day' | 'week' | 'month' | 'year' {
        const diffMs = endDate.getTime() - startDate.getTime()
        const diffDays = diffMs / (1000 * 60 * 60 * 24)

        if (diffDays < 1) return 'hour'
        if (diffDays <= 7) return 'day'
        if (diffDays <= 60) return 'week'
        if (diffDays <= 365) return 'month'
        return 'year'
    }

    // ==========================================
    // REPORT MODE
    // ==========================================

    async getProductReport(dto: any) {
        const where = this.buildOrderItemWhereClause(dto)

        const orderItems = await prisma.orderItem.findMany({
            where,
            include: {
                item: true,
                order: true
            }
        })

        // Group by product
        const productMap = new Map<number, any>()

        for (const orderItem of orderItems) {
            if (!orderItem.item) continue

            const productId = orderItem.item.id

            if (!productMap.has(productId)) {
                productMap.set(productId, {
                    code: orderItem.item.code,
                    name: orderItem.item.name,
                    quantitySold: 0,
                    revenue: 0,
                    quantityReturned: 0,
                    returnValue: 0,
                    netRevenue: 0,
                    totalCost: 0,
                    profit: 0,
                    profitMargin: 0
                })
            }

            const product = productMap.get(productId)!
            const itemCost = orderItem.item.avgUnitCost ? Number(orderItem.item.avgUnitCost) : 0

            if (orderItem.status === OrderItemStatus.CANCELED) {
                product.quantityReturned += orderItem.quantity
                product.returnValue += Number(orderItem.totalPrice)
            } else {
                product.quantitySold += orderItem.quantity
                product.revenue += Number(orderItem.totalPrice)
                product.totalCost += itemCost * orderItem.quantity
            }
        }

        // Calculate net revenue and profit for each product
        const products = Array.from(productMap.values()).map(p => {
            p.netRevenue = p.revenue - p.returnValue
            p.profit = p.netRevenue - p.totalCost
            p.profitMargin = p.netRevenue > 0 ? Number(((p.profit / p.netRevenue) * 100).toFixed(2)) : 0
            return p
        })

        // Calculate totals
        const totals = {
            totalProducts: products.length,
            totalQuantitySold: products.reduce((sum, p) => sum + p.quantitySold, 0),
            totalRevenue: products.reduce((sum, p) => sum + p.revenue, 0),
            totalQuantityReturned: products.reduce((sum, p) => sum + p.quantityReturned, 0),
            totalReturnValue: products.reduce((sum, p) => sum + p.returnValue, 0),
            totalNetRevenue: products.reduce((sum, p) => sum + p.netRevenue, 0),
            totalCost: products.reduce((sum, p) => sum + p.totalCost, 0),
            totalProfit: products.reduce((sum, p) => sum + p.profit, 0),
            averageProfitMargin: 0
        }

        totals.averageProfitMargin = totals.totalNetRevenue > 0
            ? Number(((totals.totalProfit / totals.totalNetRevenue) * 100).toFixed(2))
            : 0

        return { products, totals }
    }

    // ==========================================
    // CHART MODE - SALES CONCERN
    // ==========================================

    async getSalesChart(dto: any) {
        const where = this.buildOrderItemWhereClause(dto)

        const orderItems = await prisma.orderItem.findMany({
            where: {
                ...where,
                status: { not: OrderItemStatus.CANCELED }
            },
            include: {
                item: true,
                order: true
            }
        })

        // Group by product for revenue and quantity
        const productMap = new Map<number, any>()

        for (const orderItem of orderItems) {
            if (!orderItem.item) continue

            const productId = orderItem.item.id

            if (!productMap.has(productId)) {
                productMap.set(productId, {
                    code: orderItem.item.code,
                    name: orderItem.item.name,
                    revenue: 0,
                    quantity: 0
                })
            }

            const product = productMap.get(productId)!
            product.revenue += Number(orderItem.totalPrice)
            product.quantity += orderItem.quantity
        }

        const allProducts = Array.from(productMap.values())

        // TOP 10 by revenue
        const sortedByRevenue = [...allProducts].sort((a, b) => b.revenue - a.revenue)
        const top10Revenue = sortedByRevenue.slice(0, 10)
        const totalRevenue = allProducts.reduce((sum, p) => sum + p.revenue, 0)
        const top10RevenueTotal = top10Revenue.reduce((sum, p) => sum + p.revenue, 0)
        const othersRevenueTotal = totalRevenue - top10RevenueTotal

        const topByRevenue = top10Revenue.map(p => ({
            code: p.code,
            name: p.name,
            revenue: p.revenue,
            percentage: totalRevenue > 0 ? Number(((p.revenue / totalRevenue) * 100).toFixed(2)) : 0
        }))

        const othersRevenue = {
            revenue: othersRevenueTotal,
            percentage: totalRevenue > 0 ? Number(((othersRevenueTotal / totalRevenue) * 100).toFixed(2)) : 0
        }

        // TOP 10 by quantity
        const sortedByQuantity = [...allProducts].sort((a, b) => b.quantity - a.quantity)
        const top10Quantity = sortedByQuantity.slice(0, 10)
        const totalQuantity = allProducts.reduce((sum, p) => sum + p.quantity, 0)
        const top10QuantityTotal = top10Quantity.reduce((sum, p) => sum + p.quantity, 0)
        const othersQuantityTotal = totalQuantity - top10QuantityTotal

        const topByQuantity = top10Quantity.map(p => ({
            code: p.code,
            name: p.name,
            quantity: p.quantity,
            percentage: totalQuantity > 0 ? Number(((p.quantity / totalQuantity) * 100).toFixed(2)) : 0
        }))

        const othersQuantity = {
            quantity: othersQuantityTotal,
            percentage: totalQuantity > 0 ? Number(((othersQuantityTotal / totalQuantity) * 100).toFixed(2)) : 0
        }

        // Quantity trend over time for top 10 by quantity
        const startDate = new Date(dto.startDate)
        const endDate = new Date(dto.endDate)
        startDate.setHours(0, 0, 0, 0)
        endDate.setHours(23, 59, 59, 999)

        const timeUnit = this.determineTimeGrouping(startDate, endDate)
        const top10Codes = top10Quantity.map(p => p.code)

        // Get order items for top 10 products
        const trendItems = await prisma.orderItem.findMany({
            where: {
                ...where,
                status: { not: OrderItemStatus.CANCELED },
                item: {
                    code: { in: top10Codes }
                }
            },
            include: {
                item: true,
                order: true
            }
        })

        // Group by time period and product
        const trendMap = new Map<string, any>()

        for (const item of trendItems) {
            if (!item.item || !item.order.completedAt) continue

            let label: string

            switch (timeUnit) {
                case 'hour':
                    label = item.order.completedAt.toISOString().substring(11, 13) + ':00'
                    break
                case 'day':
                    label = item.order.completedAt.toISOString().split('T')[0]
                    break
                case 'week':
                    const weekNum = Math.ceil((item.order.completedAt.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000))
                    label = `Tuần ${weekNum}`
                    break
                case 'month':
                    const monthNames = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12']
                    label = monthNames[item.order.completedAt.getMonth()]
                    break
                case 'year':
                    label = item.order.completedAt.getFullYear().toString()
                    break
            }

            if (!trendMap.has(label)) {
                const dataPoint: any = { label }
                top10Codes.forEach(code => {
                    dataPoint[code] = 0
                })
                trendMap.set(label, dataPoint)
            }

            const dataPoint = trendMap.get(label)!
            dataPoint[item.item.code] = (dataPoint[item.item.code] || 0) + item.quantity
        }

        const quantityTrend = {
            timeUnit,
            data: Array.from(trendMap.values()),
            productNames: top10Quantity.reduce((acc, p) => {
                acc[p.code] = p.name
                return acc
            }, {} as Record<string, string>)
        }

        return {
            topByRevenue,
            othersRevenue,
            topByQuantity,
            othersQuantity,
            quantityTrend
        }
    }

    // ==========================================
    // CHART MODE - PROFIT CONCERN
    // ==========================================

    async getProfitChart(dto: any) {
        const where = this.buildOrderItemWhereClause(dto)

        const orderItems = await prisma.orderItem.findMany({
            where: {
                ...where,
                status: { not: OrderItemStatus.CANCELED }
            },
            include: {
                item: true,
                order: true
            }
        })

        // Group by product
        const productMap = new Map<number, any>()

        for (const orderItem of orderItems) {
            if (!orderItem.item) continue

            const productId = orderItem.item.id

            if (!productMap.has(productId)) {
                productMap.set(productId, {
                    code: orderItem.item.code,
                    name: orderItem.item.name,
                    revenue: 0,
                    cost: 0,
                    profit: 0,
                    profitMargin: 0
                })
            }

            const product = productMap.get(productId)!
            const itemCost = orderItem.item.avgUnitCost ? Number(orderItem.item.avgUnitCost) : 0

            product.revenue += Number(orderItem.totalPrice)
            product.cost += itemCost * orderItem.quantity
        }

        // Calculate profit and margin
        const allProducts = Array.from(productMap.values()).map(p => {
            p.profit = p.revenue - p.cost
            p.profitMargin = p.revenue > 0 ? Number(((p.profit / p.revenue) * 100).toFixed(2)) : 0
            return p
        })

        // TOP 10 by profit
        const sortedByProfit = [...allProducts].sort((a, b) => b.profit - a.profit)
        const top10Profit = sortedByProfit.slice(0, 10)
        const totalProfit = allProducts.reduce((sum, p) => sum + p.profit, 0)
        const top10ProfitTotal = top10Profit.reduce((sum, p) => sum + p.profit, 0)
        const othersProfitTotal = totalProfit - top10ProfitTotal

        const topByProfit = top10Profit.map(p => ({
            code: p.code,
            name: p.name,
            profit: p.profit,
            percentage: totalProfit > 0 ? Number(((p.profit / totalProfit) * 100).toFixed(2)) : 0
        }))

        const othersProfit = {
            profit: othersProfitTotal,
            percentage: totalProfit > 0 ? Number(((othersProfitTotal / totalProfit) * 100).toFixed(2)) : 0
        }

        // TOP 10 by profit margin
        const sortedByMargin = [...allProducts].sort((a, b) => b.profitMargin - a.profitMargin)
        const top10Margin = sortedByMargin.slice(0, 10)

        // For margin, we calculate percentage differently (it's already a %)
        const topByMargin = top10Margin.map(p => ({
            code: p.code,
            name: p.name,
            profitMargin: p.profitMargin,
            revenue: p.revenue,
            profit: p.profit
        }))

        return {
            topByProfit,
            othersProfit,
            topByMargin
        }
    }
}

export const productStatisticsService = new ProductStatisticsService()
