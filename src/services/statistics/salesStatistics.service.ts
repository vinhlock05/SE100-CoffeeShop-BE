import { prisma } from '~/config/database'
import { Prisma } from '@prisma/client'

class SalesStatisticsService {
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
     * Build common where clause for orders
     */
    private buildOrderWhereClause(dto: any): Prisma.OrderWhereInput {
        const startDate = new Date(dto.startDate)
        const endDate = new Date(dto.endDate)

        startDate.setHours(0, 0, 0, 0)
        endDate.setHours(23, 59, 59, 999)

        const where: Prisma.OrderWhereInput = {
            completedAt: {
                gte: startDate,
                lte: endDate
            },
            paymentStatus: 'paid'
        }

        // Area filter
        if (dto.areaIds && dto.areaIds.length > 0) {
            where.table = {
                areaId: {
                    in: dto.areaIds
                }
            }
        }

        // Table filter
        if (dto.tableIds && dto.tableIds.length > 0) {
            where.tableId = {
                in: dto.tableIds
            }
        }

        return where
    }

    // ==========================================
    // TIME-BASED STATISTICS
    // ==========================================

    async getTimeStatistics(dto: any) {
        const displayType = dto.displayType || 'report'

        if (displayType === 'report') {
            return this.getTimeStatisticsReport(dto)
        } else {
            return this.getTimeStatisticsChart(dto)
        }
    }

    private async getTimeStatisticsReport(dto: any) {
        const where = this.buildOrderWhereClause(dto)

        // Fetch all orders with items
        const orders = await prisma.order.findMany({
            where,
            include: {
                orderItems: {
                    where: {
                        status: {
                            not: 'cancelled'
                        }
                    }
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
                    totalRevenue: 0,
                    returnValue: 0,
                    netRevenue: 0,
                    invoices: []
                })
            }

            const day = dayMap.get(dateKey)!

            // Calculate return value (cancelled items)
            const cancelledItems = await prisma.orderItem.findMany({
                where: {
                    orderId: order.id,
                    status: 'cancelled'
                }
            })

            const returnValue = cancelledItems.reduce((sum, item) => sum + Number(item.totalPrice), 0)
            const revenue = Number(order.totalAmount)
            const netRevenue = revenue - returnValue

            day.totalRevenue += revenue
            day.returnValue += returnValue
            day.netRevenue += netRevenue

            day.invoices.push({
                orderCode: order.orderCode,
                completedAt: order.completedAt,
                revenue,
                returnValue,
                netRevenue
            })
        }

        const days = Array.from(dayMap.values())

        // Calculate totals
        const totals = {
            totalRevenue: days.reduce((sum, day) => sum + day.totalRevenue, 0),
            totalReturnValue: days.reduce((sum, day) => sum + day.returnValue, 0),
            totalNetRevenue: days.reduce((sum, day) => sum + day.netRevenue, 0)
        }

        return { days, totals }
    }

    private async getTimeStatisticsChart(dto: any) {
        const startDate = new Date(dto.startDate)
        const endDate = new Date(dto.endDate)
        const timeUnit = this.determineTimeGrouping(startDate, endDate)

        const where = this.buildOrderWhereClause(dto)

        const orders = await prisma.order.findMany({
            where,
            include: {
                orderItems: true
            }
        })

        // Group data by time unit
        const dataMap = new Map<string, number>()

        for (const order of orders) {
            let label: string

            switch (timeUnit) {
                case 'hour':
                    label = order.completedAt!.toISOString().substring(11, 13) + ':00'
                    break
                case 'day':
                    const dayNames = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7']
                    label = dayNames[order.completedAt!.getDay()]
                    break
                case 'week':
                    const weekNum = Math.ceil(
                        (order.completedAt!.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
                    )
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

            // Calculate net revenue (excluding cancelled items)
            const cancelledItems = order.orderItems.filter((item) => item.status === 'cancelled')
            const returnValue = cancelledItems.reduce((sum, item) => sum + Number(item.totalPrice), 0)
            const netRevenue = Number(order.totalAmount) - returnValue

            dataMap.set(label, (dataMap.get(label) || 0) + netRevenue)
        }

        const data = Array.from(dataMap.entries()).map(([label, netRevenue]) => ({
            label,
            netRevenue
        }))

        return { timeUnit, data }
    }

    // ==========================================
    // PROFIT STATISTICS
    // ==========================================

    async getProfitStatistics(dto: any) {
        const displayType = dto.displayType || 'report'

        if (displayType === 'report') {
            return this.getProfitStatisticsReport(dto)
        } else {
            return this.getProfitStatisticsChart(dto)
        }
    }

    private async getProfitStatisticsReport(dto: any) {
        const where = this.buildOrderWhereClause(dto)

        const orders = await prisma.order.findMany({
            where,
            include: {
                orderItems: {
                    where: {
                        status: {
                            not: 'cancelled'
                        }
                    },
                    include: {
                        item: true
                    }
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
                    totalSubtotal: 0,
                    totalDiscount: 0,
                    totalRevenue: 0,
                    totalCost: 0,
                    grossProfit: 0,
                    invoices: []
                })
            }

            const day = dayMap.get(dateKey)!

            // Calculate cost (sum of item costs * quantity)
            const cost = order.orderItems.reduce((sum, item) => {
                const itemCost = item.item?.avgUnitCost ? Number(item.item.avgUnitCost) : 0
                return sum + itemCost * item.quantity
            }, 0)

            const subtotal = Number(order.subtotal)
            const discount = Number(order.discountAmount)
            const revenue = Number(order.totalAmount)
            const grossProfit = revenue - cost

            day.totalSubtotal += subtotal
            day.totalDiscount += discount
            day.totalRevenue += revenue
            day.totalCost += cost
            day.grossProfit += grossProfit

            day.invoices.push({
                orderCode: order.orderCode,
                subtotal,
                discount,
                revenue,
                cost,
                grossProfit
            })
        }

        const days = Array.from(dayMap.values())

        // Calculate totals
        const totals = {
            totalSubtotal: days.reduce((sum, day) => sum + day.totalSubtotal, 0),
            totalDiscount: days.reduce((sum, day) => sum + day.totalDiscount, 0),
            totalRevenue: days.reduce((sum, day) => sum + day.totalRevenue, 0),
            totalCost: days.reduce((sum, day) => sum + day.totalCost, 0),
            totalGrossProfit: days.reduce((sum, day) => sum + day.grossProfit, 0)
        }

        return { days, totals }
    }

    private async getProfitStatisticsChart(dto: any) {
        const startDate = new Date(dto.startDate)
        const endDate = new Date(dto.endDate)
        const timeUnit = this.determineTimeGrouping(startDate, endDate)

        const where = this.buildOrderWhereClause(dto)

        const orders = await prisma.order.findMany({
            where,
            include: {
                orderItems: {
                    where: {
                        status: {
                            not: 'cancelled'
                        }
                    },
                    include: {
                        item: true
                    }
                }
            }
        })

        // Group data by time unit
        const dataMap = new Map<string, { revenue: number; profit: number; cost: number }>()

        for (const order of orders) {
            let label: string

            switch (timeUnit) {
                case 'hour':
                    label = order.completedAt!.toISOString().substring(11, 13) + ':00'
                    break
                case 'day':
                    const dayNames = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7']
                    label = dayNames[order.completedAt!.getDay()]
                    break
                case 'week':
                    const weekNum = Math.ceil(
                        (order.completedAt!.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
                    )
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

            const cost = order.orderItems.reduce((sum, item) => {
                const itemCost = item.item?.avgUnitCost ? Number(item.item.avgUnitCost) : 0
                return sum + itemCost * item.quantity
            }, 0)

            const revenue = Number(order.totalAmount)
            const profit = revenue - cost

            if (!dataMap.has(label)) {
                dataMap.set(label, { revenue: 0, profit: 0, cost: 0 })
            }

            const current = dataMap.get(label)!
            current.revenue += revenue
            current.profit += profit
            current.cost += cost
        }

        const data = Array.from(dataMap.entries()).map(([label, values]) => ({
            label,
            ...values
        }))

        return { timeUnit, data }
    }

    // ==========================================
    // INVOICE DISCOUNT STATISTICS
    // ==========================================

    async getInvoiceDiscountStatistics(dto: any) {
        const where = this.buildOrderWhereClause(dto)

        const orders = await prisma.order.findMany({
            where,
            orderBy: {
                completedAt: 'asc'
            }
        })

        const invoices = orders.map((order) => {
            const subtotal = Number(order.subtotal)
            const discount = Number(order.discountAmount)
            const total = Number(order.totalAmount)
            const discountPercent = subtotal > 0 ? Number(((discount / subtotal) * 100).toFixed(2)) : 0

            return {
                orderCode: order.orderCode,
                completedAt: order.completedAt,
                subtotal,
                discount,
                total,
                discountPercent
            }
        })

        // Calculate totals
        const totals = {
            totalSubtotal: invoices.reduce((sum, inv) => sum + inv.subtotal, 0),
            totalDiscount: invoices.reduce((sum, inv) => sum + inv.discount, 0),
            totalAmount: invoices.reduce((sum, inv) => sum + inv.total, 0),
            averageDiscountPercent: 0
        }

        totals.averageDiscountPercent =
            totals.totalSubtotal > 0 ? Number(((totals.totalDiscount / totals.totalSubtotal) * 100).toFixed(2)) : 0

        return { invoices, totals }
    }

    // ==========================================
    // RETURNS (CANCELLED ITEMS) STATISTICS
    // ==========================================

    async getReturnsStatistics(dto: any) {
        const startDate = new Date(dto.startDate)
        const endDate = new Date(dto.endDate)

        startDate.setHours(0, 0, 0, 0)
        endDate.setHours(23, 59, 59, 999)

        // Build where clause for cancelled items
        const where: Prisma.OrderItemWhereInput = {
            status: 'cancelled',
            updatedAt: {
                gte: startDate,
                lte: endDate
            }
        }

        // Apply order filters
        const orderWhere: Prisma.OrderWhereInput = {}

        if (dto.areaIds && dto.areaIds.length > 0) {
            orderWhere.table = {
                areaId: {
                    in: dto.areaIds
                }
            }
        }

        if (dto.tableIds && dto.tableIds.length > 0) {
            orderWhere.tableId = {
                in: dto.tableIds
            }
        }

        if (Object.keys(orderWhere).length > 0) {
            where.order = orderWhere
        }

        const cancelledItems = await prisma.orderItem.findMany({
            where,
            include: {
                order: true,
                item: true
            },
            orderBy: {
                updatedAt: 'desc'
            }
        })

        const items = cancelledItems.map((item) => ({
            productCode: item.item?.code || 'N/A',
            orderCode: item.order.orderCode,
            cancelledAt: item.updatedAt,
            quantity: item.quantity,
            returnValue: Number(item.totalPrice),
            reason: item.notes || null
        }))

        // Calculate totals
        const totals = {
            totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
            totalReturnValue: items.reduce((sum, item) => sum + item.returnValue, 0)
        }

        return { items, totals }
    }

    // ==========================================
    // TABLE STATISTICS
    // ==========================================

    async getTableStatistics(dto: any) {
        const where = this.buildOrderWhereClause(dto)

        const orders = await prisma.order.findMany({
            where,
            include: {
                table: {
                    include: {
                        area: true
                    }
                }
            }
        })

        // Group by table
        const tableMap = new Map<number, any>()

        for (const order of orders) {
            if (!order.table) continue

            const tableId = order.table.id

            if (!tableMap.has(tableId)) {
                tableMap.set(tableId, {
                    tableName: order.table.tableName,
                    areaName: order.table.area?.name || 'N/A',
                    usageCount: 0,
                    totalRevenue: 0,
                    averageRevenue: 0,
                    utilizationRate: 0
                })
            }

            const table = tableMap.get(tableId)!
            table.usageCount += 1
            table.totalRevenue += Number(order.totalAmount)
        }

        // Calculate average revenue and utilization rate
        const startDate = new Date(dto.startDate)
        const endDate = new Date(dto.endDate)
        const diffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        const maxPossibleUsage = diffDays * 3 // Assuming 3 sessions per day max

        const tables = Array.from(tableMap.values()).map((table) => ({
            ...table,
            averageRevenue: table.usageCount > 0 ? Math.round(table.totalRevenue / table.usageCount) : 0,
            utilizationRate: maxPossibleUsage > 0 ? Number(((table.usageCount / maxPossibleUsage) * 100).toFixed(2)) : 0
        }))

        // Calculate totals
        const totals = {
            totalTables: tables.length,
            totalUsageCount: tables.reduce((sum, t) => sum + t.usageCount, 0),
            totalRevenue: tables.reduce((sum, t) => sum + t.totalRevenue, 0),
            averageRevenue: 0,
            averageUtilizationRate: 0
        }

        totals.averageRevenue = totals.totalUsageCount > 0 ? Math.round(totals.totalRevenue / totals.totalUsageCount) : 0
        totals.averageUtilizationRate = tables.length > 0 ? Number((tables.reduce((sum, t) => sum + t.utilizationRate, 0) / tables.length).toFixed(2)) : 0

        return { tables, totals }
    }

    // ==========================================
    // CATEGORY STATISTICS
    // ==========================================

    async getCategoryStatistics(dto: any) {
        const where = this.buildOrderWhereClause(dto)

        const orders = await prisma.order.findMany({
            where,
            include: {
                orderItems: {
                    include: {
                        item: {
                            include: {
                                category: true
                            }
                        }
                    }
                }
            }
        })

        // Group by category
        const categoryMap = new Map<number, any>()

        for (const order of orders) {
            for (const item of order.orderItems) {
                if (!item.item?.category) continue

                const categoryId = item.item.category.id

                if (!categoryMap.has(categoryId)) {
                    categoryMap.set(categoryId, {
                        categoryName: item.item.category.name,
                        quantitySold: 0,
                        revenue: 0,
                        quantityReturned: 0,
                        returnValue: 0,
                        netRevenue: 0
                    })
                }

                const category = categoryMap.get(categoryId)!

                if (item.status === 'cancelled') {
                    category.quantityReturned += item.quantity
                    category.returnValue += Number(item.totalPrice)
                } else {
                    category.quantitySold += item.quantity
                    category.revenue += Number(item.totalPrice)
                }
            }
        }

        // Calculate net revenue
        const categories = Array.from(categoryMap.values()).map((cat) => ({
            ...cat,
            netRevenue: cat.revenue - cat.returnValue
        }))

        // Calculate totals
        const totals = {
            totalCategories: categories.length,
            totalQuantitySold: categories.reduce((sum, c) => sum + c.quantitySold, 0),
            totalRevenue: categories.reduce((sum, c) => sum + c.revenue, 0),
            totalQuantityReturned: categories.reduce((sum, c) => sum + c.quantityReturned, 0),
            totalReturnValue: categories.reduce((sum, c) => sum + c.returnValue, 0),
            totalNetRevenue: categories.reduce((sum, c) => sum + c.netRevenue, 0)
        }

        return { categories, totals }
    }
}

export const salesStatisticsService = new SalesStatisticsService()
