import { prisma } from '~/config/database'
import { OrderItemStatus } from '~/enums/order.enum'

class FinancialStatisticsService {
    // ==========================================
    // HELPER METHODS
    // ==========================================

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

    /**
     * Calculate growth rate compared to previous period
     */
    private async calculateGrowthRate(startDate: Date, endDate: Date): Promise<number> {
        const diffMs = endDate.getTime() - startDate.getTime()
        const previousStartDate = new Date(startDate.getTime() - diffMs)
        const previousEndDate = new Date(startDate.getTime() - 1)

        // Current period revenue
        const currentOrders = await prisma.order.findMany({
            where: {
                completedAt: { gte: startDate, lte: endDate },
                paymentStatus: 'paid'
            }
        })
        const currentRevenue = currentOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0)

        // Previous period revenue
        const previousOrders = await prisma.order.findMany({
            where: {
                completedAt: { gte: previousStartDate, lte: previousEndDate },
                paymentStatus: 'paid'
            }
        })
        const previousRevenue = previousOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0)

        if (previousRevenue === 0) return 0
        return Number((((currentRevenue - previousRevenue) / previousRevenue) * 100).toFixed(2))
    }

    /**
     * Get average revenue by hour (0-23)
     */
    private async getRevenueByHour(startDate: Date, endDate: Date) {
        const orders = await prisma.order.findMany({
            where: {
                completedAt: { gte: startDate, lte: endDate },
                paymentStatus: 'paid'
            }
        })

        // Group by hour
        const hourMap = new Map<number, { revenue: number; count: number }>()
        for (let i = 0; i < 24; i++) {
            hourMap.set(i, { revenue: 0, count: 0 })
        }

        for (const order of orders) {
            const hour = order.completedAt!.getHours()
            const current = hourMap.get(hour)!
            current.revenue += Number(order.totalAmount)
            current.count += 1
        }

        // Calculate average
        const diffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

        return Array.from(hourMap.entries()).map(([hour, data]) => ({
            hour,
            revenue: diffDays > 0 ? Math.round(data.revenue / diffDays) : data.revenue
        }))
    }

    /**
     * Get revenue by day of week (Monday = 1, Sunday = 0)
     */
    private async getRevenueByDayOfWeek(startDate: Date, endDate: Date) {
        const orders = await prisma.order.findMany({
            where: {
                completedAt: { gte: startDate, lte: endDate },
                paymentStatus: 'paid'
            }
        })

        // Group by day of week
        const dayMap = new Map<number, number>()
        for (let i = 0; i < 7; i++) {
            dayMap.set(i, 0)
        }

        for (const order of orders) {
            const day = order.completedAt!.getDay()
            dayMap.set(day, dayMap.get(day)! + Number(order.totalAmount))
        }

        const dayNames = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7']

        return Array.from(dayMap.entries()).map(([day, revenue]) => ({
            day: dayNames[day],
            revenue
        }))
    }

    // ==========================================
    // REPORT MODE
    // ==========================================

    /**
     * Unified Financial Report - Daily breakdown
     */
    async getUnifiedReport(dto: any) {
        const startDate = new Date(dto.startDate)
        const endDate = new Date(dto.endDate)

        startDate.setHours(0, 0, 0, 0)
        endDate.setHours(23, 59, 59, 999)

        const orders = await prisma.order.findMany({
            where: {
                completedAt: { gte: startDate, lte: endDate },
                paymentStatus: 'paid'
            },
            include: {
                orderItems: {
                    include: { item: true }
                }
            },
            orderBy: {
                completedAt: 'asc'
            }
        })

        // Group by date
        const dayMap = new Map<string, any>()

        for (const order of orders) {
            const dateKey = order.completedAt!.toISOString().split('T')[0]

            if (!dayMap.has(dateKey)) {
                dayMap.set(dateKey, {
                    date: dateKey,
                    orderCount: 0,
                    revenue: 0,
                    discount: 0,
                    returns: 0,
                    netRevenue: 0,
                    cost: 0,
                    profit: 0,
                    profitMargin: 0
                })
            }

            const day = dayMap.get(dateKey)!

            // Revenue components
            const revenue = Number(order.totalAmount) // Assuming totalAmount is final paid amount
            // Note: If totalAmount is after discount, then revenue should be totalAmount + discountAmount?
            // Usually Revenue = Gross Sales. Net Revenue = Revenue - Returns - Discounts.
            // Let's assume totalAmount is the amount user paid.

            const cancelledItems = order.orderItems.filter(item => item.status === OrderItemStatus.CANCELED)
            const returns = cancelledItems.reduce((sum, item) => sum + Number(item.totalPrice), 0)
            const discount = Number(order.discountAmount)

            // Net Revenue = Total Amount Paid (already deducted discount) - Returns (if any return logic exists, currently using cancelled items as proxy??)
            // Actually cancelled items usually don't count into Revenue if they are cancelled before payment.
            // If paymentStatus is Paid, assume cancelled items were refunded or not included.
            // Let's stick to simple logic: 
            // Revenue = Sum of all orders. 
            // Cost = Sum of cost of goods sold (excluding cancelled).

            const validItems = order.orderItems.filter(item => item.status !== OrderItemStatus.CANCELED)

            // Calculate Cost
            const cost = validItems.reduce((sum, item) => {
                const itemCost = item.item?.avgUnitCost ? Number(item.item.avgUnitCost) : 0
                return sum + itemCost * item.quantity
            }, 0)

            day.orderCount += 1
            day.revenue += revenue
            day.discount += discount
            day.returns += returns
            day.netRevenue += revenue - returns // If revenue is what user paid
            day.cost += cost
            day.profit += (revenue - returns) - cost // Profit = Net Revenue - Cost
        }

        // Calculate profit margin for each day
        const days = Array.from(dayMap.values()).map(day => ({
            ...day,
            profitMargin: day.netRevenue > 0 ? Number(((day.profit / day.netRevenue) * 100).toFixed(2)) : 0
        }))

        // Calculate totals
        const totals = {
            totalOrders: days.reduce((sum, d) => sum + d.orderCount, 0),
            totalRevenue: days.reduce((sum, d) => sum + d.revenue, 0),
            totalDiscount: days.reduce((sum, d) => sum + d.discount, 0),
            totalReturns: days.reduce((sum, d) => sum + d.returns, 0),
            totalNetRevenue: days.reduce((sum, d) => sum + d.netRevenue, 0),
            totalCost: days.reduce((sum, d) => sum + d.cost, 0),
            totalProfit: days.reduce((sum, d) => sum + d.profit, 0),
            averageProfitMargin: 0
        }

        totals.averageProfitMargin = totals.totalNetRevenue > 0
            ? Number(((totals.totalProfit / totals.totalNetRevenue) * 100).toFixed(2))
            : 0

        return { days, totals }
    }

    // ==========================================
    // CHART MODE
    // ==========================================

    /**
     * Unified Financial Chart Data
     */
    async getUnifiedChart(dto: any) {
        const startDate = new Date(dto.startDate)
        const endDate = new Date(dto.endDate)

        startDate.setHours(0, 0, 0, 0)
        endDate.setHours(23, 59, 59, 999)

        const timeUnit = this.determineTimeGrouping(startDate, endDate)

        const orders = await prisma.order.findMany({
            where: {
                completedAt: { gte: startDate, lte: endDate },
                paymentStatus: 'paid'
            },
            include: {
                orderItems: {
                    include: { item: true }
                }
            }
        })

        // Main chart data
        const dataMap = new Map<string, { revenue: number; cost: number; profit: number }>()

        for (const order of orders) {
            let label: string

            switch (timeUnit) {
                case 'hour':
                    label = order.completedAt!.toISOString().substring(11, 13) + ':00'
                    break
                case 'day':
                    const day = order.completedAt!.getDate().toString().padStart(2, '0')
                    const month = (order.completedAt!.getMonth() + 1).toString().padStart(2, '0')
                    const year = order.completedAt!.getFullYear()
                    label = `${day}/${month}/${year}`
                    break
                case 'week':
                    const weekNum = Math.ceil((order.completedAt!.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000))
                    label = `Tuần ${weekNum}`
                    break
                case 'month':
                    const monthNames = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12']
                    label = monthNames[order.completedAt!.getMonth()]
                    break
                case 'year':
                    label = order.completedAt!.getFullYear().toString()
                    break
            }

            if (!dataMap.has(label)) {
                dataMap.set(label, { revenue: 0, cost: 0, profit: 0 })
            }
            const current = dataMap.get(label)!

            // Calculate metrics for this order
            const revenue = Number(order.totalAmount)

            const validItems = order.orderItems.filter(item => item.status !== OrderItemStatus.CANCELED)
            const cost = validItems.reduce((sum, item) => {
                const itemCost = item.item?.avgUnitCost ? Number(item.item.avgUnitCost) : 0
                return sum + itemCost * item.quantity
            }, 0)

            const cancelledItems = order.orderItems.filter(item => item.status === OrderItemStatus.CANCELED)
            const returns = cancelledItems.reduce((sum, item) => sum + Number(item.totalPrice), 0)

            // Net Revenue for profit calc
            const netRevenue = revenue - returns
            const profit = netRevenue - cost

            current.revenue += revenue
            current.cost += cost
            current.profit += profit
        }

        const data = Array.from(dataMap.entries()).map(([label, values]) => ({
            label,
            ...values
        }))

        // Calculate global metrics
        const totalRevenue = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0)

        // Calculate total cost
        const totalCost = orders.reduce((sum, o) => {
            const validItems = o.orderItems.filter(item => item.status !== OrderItemStatus.CANCELED)
            return sum + validItems.reduce((itemSum, item) => {
                const itemCost = item.item?.avgUnitCost ? Number(item.item.avgUnitCost) : 0
                return itemSum + itemCost * item.quantity
            }, 0)
        }, 0)

        const allCancelledItems = orders.flatMap(o =>
            o.orderItems.filter(item => item.status === OrderItemStatus.CANCELED)
        )
        const cancelledItemsValue = allCancelledItems.reduce((sum, item) => sum + Number(item.totalPrice), 0)
        const cancelledItemsCount = allCancelledItems.reduce((sum, item) => sum + item.quantity, 0)
        const totalDiscount = orders.reduce((sum, o) => sum + Number(o.discountAmount), 0)

        const deductions = totalDiscount + cancelledItemsValue
        const netRevenue = totalRevenue - cancelledItemsValue
        const totalProfit = netRevenue - totalCost
        const netRevenuePercentage = totalRevenue > 0 ? Number(((netRevenue / totalRevenue) * 100).toFixed(2)) : 0
        const totalOrders = orders.length

        const growthRate = await this.calculateGrowthRate(startDate, endDate)
        const revenueByHour = await this.getRevenueByHour(startDate, endDate)
        const revenueByDayOfWeek = await this.getRevenueByDayOfWeek(startDate, endDate)

        return {
            timeUnit,
            data,
            revenueByHour,
            revenueByDayOfWeek,
            metrics: {
                totalRevenue,
                totalCost,
                totalProfit,
                growthRate,
                deductions,
                netRevenue,
                netRevenuePercentage,
                totalOrders,
                cancelledItemsCount
            }
        }
    }
}

export const financialStatisticsService = new FinancialStatisticsService()
