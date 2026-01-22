import { prisma } from '~/config/database'
import { OrderItemStatus } from '~/enums/order.enum'
import { Response } from 'express'
import * as ExcelJS from 'exceljs'
import { start } from 'repl'

class StaffStatisticsService {
    /**
     * Get Profit Report by Staff
     */
    async getProfitReport(startDate: Date, endDate: Date) {
        // Fetch all completed orders in date range
        const orders = await prisma.order.findMany({
            where: {
                completedAt: { gte: startDate, lte: endDate },
                paymentStatus: 'paid'
            },
            select: {
                id: true,
                discountAmount: true,
                staff: {
                    select: {
                        id: true,
                        code: true,
                        fullName: true
                    }
                },
                orderItems: {
                    include: {
                        item: {
                            select: {
                                code: true,
                                name: true,
                                avgUnitCost: true
                            }
                        }
                    }
                }
            }
        })

        // Group by staff
        const staffMap = new Map<number, {
            staffId: number
            staffCode: string
            staffName: string
            totalRevenue: number
            discount: number
            netRevenue: number
            returns: number
            cost: number
            profit: number
        }>()

        for (const order of orders) {
            if (!order.staff) continue

            const staffId = order.staff.id
            if (!staffMap.has(staffId)) {
                staffMap.set(staffId, {
                    staffId: order.staff.id,
                    staffCode: order.staff.code,
                    staffName: order.staff.fullName,
                    totalRevenue: 0,
                    discount: 0,
                    netRevenue: 0,
                    returns: 0,
                    cost: 0,
                    profit: 0
                })
            }

            const staffData = staffMap.get(staffId)!

            // Calculate revenue from order items (excluding canceled)
            for (const item of order.orderItems) {
                if (item.status !== OrderItemStatus.CANCELED) {
                    const itemRevenue = Number(item.totalPrice)
                    const itemCost = item.quantity * Number(item.item?.avgUnitCost || 0)

                    staffData.totalRevenue += itemRevenue
                    staffData.cost += itemCost
                } else {
                    // Canceled items count as returns
                    staffData.returns += Number(item.totalPrice)
                }
            }

            // Add order-level discount
            staffData.discount += Number(order.discountAmount || 0)
        }

        // Calculate net revenue and profit for each staff
        const staffList = Array.from(staffMap.values()).map(staff => ({
            ...staff,
            netRevenue: staff.totalRevenue - staff.discount - staff.returns,
            profit: staff.totalRevenue - staff.discount - staff.returns - staff.cost
        }))

        // Calculate totals
        const totals = {
            totalStaff: staffList.length,
            totalRevenue: staffList.reduce((sum, s) => sum + s.totalRevenue, 0),
            totalDiscount: staffList.reduce((sum, s) => sum + s.discount, 0),
            totalNetRevenue: staffList.reduce((sum, s) => sum + s.netRevenue, 0),
            totalReturns: staffList.reduce((sum, s) => sum + s.returns, 0),
            totalCost: staffList.reduce((sum, s) => sum + s.cost, 0),
            totalProfit: staffList.reduce((sum, s) => sum + s.profit, 0)
        }

        return {
            concern: 'profit',
            displayType: 'report',
            totals,
            staff: staffList.sort((a, b) => b.profit - a.profit)
        }
    }

    /**
     * Get Profit Chart (Top 10 Staff by Profit)
     */
    async getProfitChart(startDate: Date, endDate: Date) {
        const reportData = await this.getProfitReport(startDate, endDate)

        return {
            concern: 'profit',
            displayType: 'chart',
            data: reportData.staff.slice(0, 10).map(s => ({
                staffId: s.staffId,
                staffCode: s.staffCode,
                staffName: s.staffName,
                profit: s.profit
            }))
        }
    }

    /**
     * Get Sales Report by Staff (with product breakdown)
     */
    async getSalesReport(startDate: Date, endDate: Date) {
        const orders = await prisma.order.findMany({
            where: {
                completedAt: { gte: startDate, lte: endDate },
                paymentStatus: 'paid'
            },
            include: {
                staff: true,
                orderItems: {
                    include: {
                        item: true
                    }
                }
            }
        })

        // Group by staff, then by product
        const staffMap = new Map<number, {
            staffId: number
            staffCode: string
            staffName: string
            quantitySold: number
            revenue: number
            quantityReturned: number
            returnValue: number
            netRevenue: number
            products: Map<number, {
                productCode: string
                productName: string
                quantitySold: number
                revenue: number
                quantityReturned: number
                returnValue: number
                netRevenue: number
            }>
        }>()

        for (const order of orders) {
            if (!order.staff) continue

            const staffId = order.staff.id
            if (!staffMap.has(staffId)) {
                staffMap.set(staffId, {
                    staffId: order.staff.id,
                    staffCode: order.staff.code,
                    staffName: order.staff.fullName,
                    quantitySold: 0,
                    revenue: 0,
                    quantityReturned: 0,
                    returnValue: 0,
                    netRevenue: 0,
                    products: new Map()
                })
            }

            const staffData = staffMap.get(staffId)!

            for (const orderItem of order.orderItems) {
                const itemId = orderItem.itemId
                if (!itemId) continue // Skip if no item

                const isCanceled = orderItem.status === OrderItemStatus.CANCELED

                // Initialize product if not exists
                if (!staffData.products.has(itemId)) {
                    staffData.products.set(itemId, {
                        productCode: orderItem.item?.code || '',
                        productName: orderItem.item?.name || '',
                        quantitySold: 0,
                        revenue: 0,
                        quantityReturned: 0,
                        returnValue: 0,
                        netRevenue: 0
                    })
                }

                const productData = staffData.products.get(itemId)!

                if (isCanceled) {
                    // Returned items
                    staffData.quantityReturned += orderItem.quantity
                    staffData.returnValue += Number(orderItem.totalPrice)
                    productData.quantityReturned += orderItem.quantity
                    productData.returnValue += Number(orderItem.totalPrice)
                } else {
                    // Sold items
                    staffData.quantitySold += orderItem.quantity
                    staffData.revenue += Number(orderItem.totalPrice)
                    productData.quantitySold += orderItem.quantity
                    productData.revenue += Number(orderItem.totalPrice)
                }
            }
        }

        // Convert to array and calculate net revenue
        const staffList = Array.from(staffMap.values()).map(staff => ({
            staffId: staff.staffId,
            staffCode: staff.staffCode,
            staffName: staff.staffName,
            quantitySold: staff.quantitySold,
            revenue: staff.revenue,
            quantityReturned: staff.quantityReturned,
            returnValue: staff.returnValue,
            netRevenue: staff.revenue - staff.returnValue,
            products: Array.from(staff.products.values()).map(p => ({
                ...p,
                netRevenue: p.revenue - p.returnValue
            })).sort((a, b) => b.netRevenue - a.netRevenue)
        }))

        // Calculate totals
        const totals = {
            totalStaff: staffList.length,
            totalQuantitySold: staffList.reduce((sum, s) => sum + s.quantitySold, 0),
            totalRevenue: staffList.reduce((sum, s) => sum + s.revenue, 0),
            totalQuantityReturned: staffList.reduce((sum, s) => sum + s.quantityReturned, 0),
            totalReturnValue: staffList.reduce((sum, s) => sum + s.returnValue, 0),
            totalNetRevenue: staffList.reduce((sum, s) => sum + s.netRevenue, 0)
        }

        return {
            concern: 'sales',
            displayType: 'report',
            totals,
            staff: staffList.sort((a, b) => b.netRevenue - a.netRevenue)
        }
    }

    /**
     * Get Sales Chart (Top 10 Staff by Order Count)
     */
    async getSalesChart(startDate: Date, endDate: Date) {
        const orders = await prisma.order.findMany({
            where: {
                completedAt: { gte: startDate, lte: endDate },
                paymentStatus: 'paid'
            },
            include: {
                staff: true
            }
        })

        // Count orders per staff
        const staffOrderCount = new Map<number, {
            staffId: number
            staffCode: string
            staffName: string
            orderCount: number
        }>()

        for (const order of orders) {
            if (!order.staff) continue

            const staffId = order.staff.id
            if (!staffOrderCount.has(staffId)) {
                staffOrderCount.set(staffId, {
                    staffId: order.staff.id,
                    staffCode: order.staff.code,
                    staffName: order.staff.fullName,
                    orderCount: 0
                })
            }

            staffOrderCount.get(staffId)!.orderCount++
        }

        // Sort by order count and get top 10
        const topStaff = Array.from(staffOrderCount.values())
            .sort((a, b) => b.orderCount - a.orderCount)
            .slice(0, 10)

        return {
            concern: 'sales',
            displayType: 'chart',
            data: topStaff
        }
    }


    // ==========================================
    // EXPORT
    // ==========================================

    async exportStaffReport(dto: any, res: Response) {
        const { concern, startDate, endDate } = dto
        // dto might have startDate/endDate as strings, ensure Date
        const start = new Date(startDate)
        const end = new Date(endDate)
        start.setHours(0,0,0,0)
        end.setHours(23,59,59,999)

        const workbook = new ExcelJS.Workbook()
        const worksheet = workbook.addWorksheet('Báo Cáo Nhân Viên')

        if (concern === 'profit') {
            const data = await this.getProfitReport(start, end)
            
            worksheet.columns = [
                { header: 'Mã NV', key: 'code', width: 15 },
                { header: 'Tên nhân viên', key: 'name', width: 30 },
                { header: 'Doanh thu', key: 'revenue', width: 20 },
                { header: 'Trừ: Giảm giá', key: 'discount', width: 20 },
                { header: 'Trừ: Trả hàng', key: 'returns', width: 20 },
                { header: 'Doanh thu thuần', key: 'net', width: 20 },
                { header: 'Trừ: Giá vốn', key: 'cost', width: 20 },
                { header: 'Lợi nhuận gộp', key: 'profit', width: 20 }
            ]

             if(data && data.staff) {
                data.staff.forEach((s: any) => {
                    worksheet.addRow({
                        code: s.staffCode,
                        name: s.staffName,
                        revenue: s.totalRevenue,
                        discount: s.discount,
                        returns: s.returns,
                        net: s.netRevenue,
                        cost: s.cost,
                        profit: s.profit
                    })
                })
                 if(data.totals) {
                     worksheet.addRow(['Tổng cộng', '', data.totals.totalRevenue, data.totals.totalDiscount, data.totals.totalReturns, data.totals.totalNetRevenue, data.totals.totalCost, data.totals.totalProfit])
                     worksheet.getRow(worksheet.rowCount).font = { bold: true }
                }
            }

        } else if (concern === 'sales') {
            const data = await this.getSalesReport(start, end)
            
            worksheet.columns = [
                { header: 'Mã NV', key: 'code', width: 15 },
                { header: 'Tên nhân viên', key: 'name', width: 30 },
                { header: 'SL Bán', key: 'sold', width: 12 },
                { header: 'Doanh thu', key: 'revenue', width: 20 },
                { header: 'SL Trả', key: 'returned', width: 12 },
                { header: 'Giá trị trả', key: 'returnVal', width: 20 },
                { header: 'Doanh thu thuần', key: 'net', width: 20 }
            ]

            if(data && data.staff) {
                data.staff.forEach((s: any) => {
                    worksheet.addRow({
                        code: s.staffCode,
                        name: s.staffName,
                        sold: s.quantitySold,
                        revenue: s.revenue,
                        returned: s.quantityReturned,
                        returnVal: s.returnValue,
                        net: s.netRevenue
                    })
                })
                 if(data.totals) {
                     worksheet.addRow(['Tổng cộng', '', data.totals.totalQuantitySold, data.totals.totalRevenue, data.totals.totalQuantityReturned, data.totals.totalReturnValue, data.totals.totalNetRevenue])
                     worksheet.getRow(worksheet.rowCount).font = { bold: true }
                }
            }
        }

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        res.setHeader('Content-Disposition', `attachment; filename=BaoCaoNhanVien_${concern}_${new Date().getTime()}.xlsx`)
        
        await workbook.xlsx.write(res)
        res.end()
    }
}

export default new StaffStatisticsService()
