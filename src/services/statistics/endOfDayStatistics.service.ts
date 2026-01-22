import { prisma } from '~/config/database'
import { BadRequestError } from '~/core/error.response'
import { Prisma } from '@prisma/client'
import { OrderItemStatus } from '~/enums/order.enum'
import { Response } from 'express'
import * as ExcelJS from 'exceljs'
import { StatisticsConcern } from '~/enums'

class StatisticsService {
    // ==========================================
    // SALES STATISTICS
    // ==========================================

    async getSalesStatistics(dto: any) {
        // Validate date range
        const startDate = new Date(dto.startDate)
        const endDate = new Date(dto.endDate)

        if (startDate > endDate) {
            throw new BadRequestError({ message: 'Start date must be before or equal to end date' })
        }

        // Set time to start and end of day
        startDate.setHours(0, 0, 0, 0)
        endDate.setHours(23, 59, 59, 999)

        // Build where clause
        const where: Prisma.OrderWhereInput = {
            completedAt: {
                gte: startDate,
                lte: endDate
            },
            paymentStatus: 'paid' // Only completed/paid orders
        }

        // Customer search filter
        if (dto.customerSearch) {
            where.customer = {
                OR: [
                    { code: { contains: dto.customerSearch, mode: 'insensitive' } },
                    { name: { contains: dto.customerSearch, mode: 'insensitive' } },
                    { phone: { contains: dto.customerSearch, mode: 'insensitive' } }
                ]
            }
        }

        // Staff filter (null/undefined/empty array = all)
        if (dto.staffIds && dto.staffIds.length > 0) {
            where.staffId = { in: dto.staffIds }
        }

        // Payment method filter
        if (dto.paymentMethods && dto.paymentMethods.length > 0) {
            where.paymentMethod = { in: dto.paymentMethods }
        }

        // Fetch orders with related data
        const orders = await prisma.order.findMany({
            where,
            include: {
                customer: {
                    select: {
                        id: true,
                        code: true,
                        name: true,
                        phone: true
                    }
                },
                staff: {
                    select: {
                        id: true,
                        code: true,
                        fullName: true,
                        user: {
                            select: {
                                role: {
                                    select: {
                                        name: true
                                    }
                                }
                            }
                        }
                    }
                },
                orderItems: {
                    where: {
                        isTopping: false // Only main items, not toppings
                    },
                    include: {
                        item: {
                            select: {
                                code: true,
                                name: true
                            }
                        },
                        combo: {
                            select: {
                                name: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                completedAt: 'desc'
            }
        })

        // Format response
        const invoices = orders.map(order => ({
            orderCode: order.orderCode,
            completedAt: order.completedAt!,
            customer: order.customer,
            items: order.orderItems.map(item => ({
                productCode: item.item?.code || item.combo?.name || item.name,
                productName: item.name,
                quantity: item.quantity,
                unitPrice: Number(item.unitPrice),
                totalPrice: Number(item.totalPrice)
            })),
            totalAmount: Number(order.totalAmount),
            paymentMethod: order.paymentMethod,
            staff: order.staff ? {
                id: order.staff.id,
                code: order.staff.code,
                name: order.staff.fullName,
                role: order.staff.user?.role.name || 'N/A'
            } : null
        }))

        return { invoices }
    }

    // ==========================================
    // REVENUE/EXPENSES STATISTICS
    // ==========================================

    async getRevenueExpensesStatistics(dto: any) {
        // Validate date range
        const startDate = new Date(dto.startDate)
        const endDate = new Date(dto.endDate)

        if (startDate > endDate) {
            throw new BadRequestError({ message: 'Start date must be before or equal to end date' })
        }

        startDate.setHours(0, 0, 0, 0)
        endDate.setHours(23, 59, 59, 999)

        // Build where clause
        const where: Prisma.FinanceTransactionWhereInput = {
            transactionDate: {
                gte: startDate,
                lte: endDate
            }
            // Note: status field doesn't exist in FinanceTransaction, filtering completed only
        }

        // Customer/Person search filter
        if (dto.customerSearch) {
            where.OR = [
                { personName: { contains: dto.customerSearch, mode: 'insensitive' } }
                // Note: personPhone doesn't exist, using only personName
            ]
        }

        // Staff filter (creator)
        if (dto.staffIds && dto.staffIds.length > 0) {
            where.createdBy = { in: dto.staffIds }
        }

        // Payment method filter
        if (dto.paymentMethods && dto.paymentMethods.length > 0) {
            where.paymentMethod = { in: dto.paymentMethods }
        }

        // Category filter (transaction types)
        if (dto.categoryIds && dto.categoryIds.length > 0) {
            where.categoryId = { in: dto.categoryIds }
        }

        // Fetch transactions
        const transactions = await prisma.financeTransaction.findMany({
            where,
            include: {
                category: {
                    select: {
                        id: true,
                        name: true,
                        type: {
                            select: {
                                name: true
                            }
                        }
                    }
                },
                creator: {
                    select: {
                        id: true,
                        code: true,
                        fullName: true
                    }
                }
            },
            orderBy: {
                transactionDate: 'desc'
            }
        })

        // Format response
        const formattedTransactions = transactions.map(tx => ({
            code: tx.code,
            category: {
                id: tx.category.id,
                name: tx.category.name,
                type: tx.category.type.name
            },
            personReceiving: tx.personName,
            creator: tx.creator ? {
                id: tx.creator.id,
                code: tx.creator.code,
                name: tx.creator.fullName
            } : null,
            amount: Number(tx.amount),
            transactionDate: tx.transactionDate,
            paymentMethod: tx.paymentMethod
        }))

        return { transactions: formattedTransactions }
    }

    // ==========================================
    // INVENTORY STATISTICS
    // ==========================================

    async getInventoryStatistics(dto: any) {
        // Validate date range
        const startDate = new Date(dto.startDate)
        const endDate = new Date(dto.endDate)

        if (startDate > endDate) {
            throw new BadRequestError({ message: 'Start date must be before or equal to end date' })
        }

        startDate.setHours(0, 0, 0, 0)
        endDate.setHours(23, 59, 59, 999)

        // Build where clause for order items
        const orderWhere: Prisma.OrderWhereInput = {
            completedAt: {
                gte: startDate,
                lte: endDate
            },
            paymentStatus: 'paid'
        }

        const itemWhere: Prisma.InventoryItemWhereInput = {}

        // Product search filter
        if (dto.productSearch) {
            itemWhere.OR = [
                { code: { contains: dto.productSearch, mode: 'insensitive' } },
                { name: { contains: dto.productSearch, mode: 'insensitive' } }
            ]
        }

        // Category filter
        if (dto.categoryIds && dto.categoryIds.length > 0) {
            itemWhere.categoryId = { in: dto.categoryIds }
        }

        // Fetch order items with product info
        const orderItems = await prisma.orderItem.findMany({
            where: {
                order: orderWhere,
                item: itemWhere,
                isTopping: false // Exclude toppings
            },
            include: {
                item: {
                    select: {
                        id: true,
                        code: true,
                        name: true,
                        category: {
                            select: {
                                name: true
                            }
                        }
                    }
                },
                order: {
                    select: {
                        completedAt: true,
                        status: true
                    }
                }
            }
        })

        // Group by product and calculate metrics
        const productMap = new Map<number, {
            code: string
            name: string
            categoryName: string | null
            quantitySold: number
            revenue: number
            quantityReturned: number
            returnAmount: number
            latestSaleDate: Date | null
        }>()

        for (const item of orderItems) {
            if (!item.item) continue // Skip if no item (could be combo)

            const productId = item.item.id
            const existing = productMap.get(productId)

            // Determine if this is a return/cancellation
            const isReturn = item.status === OrderItemStatus.CANCELED || item.status === 'returned'
            const quantity = item.quantity
            const amount = Number(item.totalPrice)

            if (existing) {
                if (isReturn) {
                    existing.quantityReturned += quantity
                    existing.returnAmount += amount
                } else {
                    existing.quantitySold += quantity
                    existing.revenue += amount
                }

                // Update latest sale date
                if (item.order.completedAt && (!existing.latestSaleDate || item.order.completedAt > existing.latestSaleDate)) {
                    existing.latestSaleDate = item.order.completedAt
                }
            } else {
                productMap.set(productId, {
                    code: item.item.code,
                    name: item.item.name,
                    categoryName: item.item.category?.name || null,
                    quantitySold: isReturn ? 0 : quantity,
                    revenue: isReturn ? 0 : amount,
                    quantityReturned: isReturn ? quantity : 0,
                    returnAmount: isReturn ? amount : 0,
                    latestSaleDate: item.order.completedAt
                })
            }
        }

        // Convert map to array and calculate net revenue
        const products = Array.from(productMap.values()).map(p => ({
            productCode: p.code,
            productName: p.name,
            categoryName: p.categoryName,
            saleDate: p.latestSaleDate,
            quantitySold: p.quantitySold,
            revenue: p.revenue,
            quantityReturned: p.quantityReturned,
            returnAmount: p.returnAmount,
            netRevenue: p.revenue - p.returnAmount
        }))

        // Calculate totals
        const totals = {
            totalProducts: products.length,
            totalQuantitySold: products.reduce((sum, p) => sum + p.quantitySold, 0),
            totalRevenue: products.reduce((sum, p) => sum + p.revenue, 0),
            totalQuantityReturned: products.reduce((sum, p) => sum + p.quantityReturned, 0),
            totalReturnAmount: products.reduce((sum, p) => sum + p.returnAmount, 0),
            totalNetRevenue: products.reduce((sum, p) => sum + p.netRevenue, 0)
        }

        return { products, totals }
    }

    // ==========================================
    // CANCELLED ITEMS STATISTICS
    // ==========================================

    async getCancelledItemsStatistics(dto: any) {
        // Validate date range
        const startDate = new Date(dto.startDate)
        const endDate = new Date(dto.endDate)

        if (startDate > endDate) {
            throw new BadRequestError({ message: 'Start date must be before or equal to end date' })
        }

        // Set time to start and end of day
        startDate.setHours(0, 0, 0, 0)
        endDate.setHours(23, 59, 59, 999)

        // Build where clause for OrderItem
        const where: Prisma.OrderItemWhereInput = {
            status: OrderItemStatus.CANCELED,
            updatedAt: {
                gte: startDate,
                lte: endDate
            }
        }

        // Build order where clause for filters
        const orderWhere: Prisma.OrderWhereInput = {}

        // Customer search filter
        if (dto.customerSearch) {
            orderWhere.customer = {
                OR: [
                    { code: { contains: dto.customerSearch, mode: 'insensitive' } },
                    { name: { contains: dto.customerSearch, mode: 'insensitive' } },
                    { phone: { contains: dto.customerSearch, mode: 'insensitive' } }
                ]
            }
        }

        // Staff filter
        if (dto.staffIds && dto.staffIds.length > 0) {
            orderWhere.staffId = {
                in: dto.staffIds
            }
        }

        // Apply order filters to where clause
        if (Object.keys(orderWhere).length > 0) {
            where.order = orderWhere
        }

        // Product search filter
        if (dto.productSearch) {
            where.OR = [
                {
                    item: {
                        OR: [
                            { code: { contains: dto.productSearch, mode: 'insensitive' } },
                            { name: { contains: dto.productSearch, mode: 'insensitive' } }
                        ]
                    }
                },
                { name: { contains: dto.productSearch, mode: 'insensitive' } }
            ]
        }

        // Query cancelled items
        const cancelledItems = await prisma.orderItem.findMany({
            where,
            include: {
                order: {
                    include: {
                        customer: true,
                        staff: true
                    }
                },
                item: true
            },
            orderBy: {
                updatedAt: 'desc'
            }
        })

        // Format response
        const items = cancelledItems.map((item) => ({
            productCode: item.item?.code || 'N/A',
            orderCode: item.order.orderCode,
            productName: item.name,
            cancelledAt: item.updatedAt,
            customer: item.order.customer
                ? {
                    name: item.order.customer.name,
                    phone: item.order.customer.phone
                }
                : null,
            quantity: item.quantity,
            unitPrice: Number(item.unitPrice),
            totalPrice: Number(item.totalPrice),
            staff: item.order.staff
                ? {
                    code: item.order.staff.code,
                    name: item.order.staff.fullName
                }
                : {
                    code: 'N/A',
                    name: 'N/A'
                },
            reason: item.notes || null
        }))

        // Calculate totals
        const totals = {
            totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
            totalUnitPrice: items.reduce((sum, item) => sum + item.unitPrice, 0),
            totalAmount: items.reduce((sum, item) => sum + item.totalPrice, 0)
        }

        return { items, totals }
    }


    // ==========================================
    // EXPORT
    // ==========================================

    async exportEndOfDayReport(dto: any, res: Response) {
        const { concern } = dto
        const workbook = new ExcelJS.Workbook()
        const worksheet = workbook.addWorksheet('Báo Cáo Cuối Ngày')

        // Fetch data based on concern
        if (concern === StatisticsConcern.SALES) {
            const data = await this.getSalesStatistics(dto)
            
            // Set Columns
            worksheet.columns = [
                { header: 'Mã HĐ', key: 'orderCode', width: 20 },
                { header: 'Thời gian', key: 'completedAt', width: 25 },
                { header: 'Khách hàng', key: 'customer', width: 30 },
                { header: 'Tổng tiền', key: 'totalAmount', width: 20 },
                { header: 'Thanh toán', key: 'paymentMethod', width: 15 },
                { header: 'Nhân viên', key: 'staff', width: 20 }
            ]

            // Add rows
            data.invoices.forEach((inv) => {
                worksheet.addRow({
                    orderCode: inv.orderCode,
                    completedAt: inv.completedAt.toLocaleString('vi-VN'),
                    customer: inv.customer ? `${inv.customer.name} - ${inv.customer.phone}` : 'Khách lẻ',
                    totalAmount: inv.totalAmount,
                    paymentMethod: inv.paymentMethod,
                    staff: inv.staff ? inv.staff.name : 'N/A'
                })
            })

            // Add details in separate sheet or expanding rows? 
            // For simple export, let's keep it flat or summary level. 
            // User can check details in app. Or we can list items in a 'Items' column?
            
        } else if (concern === StatisticsConcern.REVENUE_EXPENSES) {
            const data = await this.getRevenueExpensesStatistics(dto)

            worksheet.columns = [
                { header: 'Mã Phiếu', key: 'code', width: 20 },
                { header: 'Loại', key: 'type', width: 15 },
                { header: 'Hạng mục', key: 'category', width: 25 },
                { header: 'Người nhận/nộp', key: 'person', width: 25 },
                { header: 'Số tiền', key: 'amount', width: 20 },
                { header: 'Thời gian', key: 'date', width: 25 },
                { header: 'Người tạo', key: 'creator', width: 20 }
            ]

            data.transactions.forEach(tx => {
                worksheet.addRow({
                    code: tx.code,
                    type: tx.category.type,
                    category: tx.category.name,
                    person: tx.personReceiving,
                    amount: tx.amount,
                    date: tx.transactionDate.toLocaleString('vi-VN'),
                    creator: tx.creator ? tx.creator.name : 'N/A'
                })
            })

        } else if (concern === StatisticsConcern.INVENTORY) {
            const data = await this.getInventoryStatistics(dto)

            worksheet.columns = [
                { header: 'Mã SP', key: 'code', width: 15 },
                { header: 'Tên sản phẩm', key: 'name', width: 30 },
                { header: 'Danh mục', key: 'category', width: 20 },
                { header: 'SL Bán', key: 'sold', width: 12 },
                { header: 'Doanh thu', key: 'revenue', width: 20 },
                { header: 'SL Trả', key: 'returned', width: 12 },
                { header: 'Giá trị trả', key: 'returnVal', width: 20 },
                { header: 'Thuần', key: 'net', width: 20 }
            ]

            data.products.forEach(p => {
                worksheet.addRow({
                    code: p.productCode,
                    name: p.productName,
                    category: p.categoryName || '',
                    sold: p.quantitySold,
                    revenue: p.revenue,
                    returned: p.quantityReturned,
                    returnVal: p.returnAmount,
                    net: p.netRevenue
                })
            })
            
            // Add Total Row
            worksheet.addRow(['Tổng cộng', '', '', data.totals.totalQuantitySold, data.totals.totalRevenue, data.totals.totalQuantityReturned, data.totals.totalReturnAmount, data.totals.totalNetRevenue])
            worksheet.getRow(worksheet.rowCount).font = { bold: true }

        } else if (concern === StatisticsConcern.CANCELLED_ITEMS) {
            const data = await this.getCancelledItemsStatistics(dto)

            worksheet.columns = [
                { header: 'Mã HĐ', key: 'orderCode', width: 20 },
                { header: 'Mã SP', key: 'productCode', width: 15 },
                { header: 'Tên sản phẩm', key: 'productName', width: 30 },
                { header: 'Thời gian', key: 'time', width: 25 },
                { header: 'Khách hàng', key: 'customer', width: 25 },
                { header: 'SL', key: 'qty', width: 10 },
                { header: 'Đơn giá', key: 'price', width: 20 },
                { header: 'Thành tiền', key: 'total', width: 20 },
                { header: 'Người hủy', key: 'staff', width: 20 },
                { header: 'Lý do', key: 'reason', width: 30 }
            ]

            data.items.forEach(item => {
                worksheet.addRow({
                    orderCode: item.orderCode,
                    productCode: item.productCode,
                    productName: item.productName,
                    time: item.cancelledAt.toLocaleString('vi-VN'),
                    customer: item.customer ? item.customer.name : 'Khách lẻ',
                    qty: item.quantity,
                    price: item.unitPrice,
                    total: item.totalPrice,
                    staff: item.staff.name,
                    reason: item.reason
                })
            })
            
             // Add Total Row
             worksheet.addRow(['Tổng cộng', '', '', '', '', data.totals.totalQuantity, '', data.totals.totalAmount, '', ''])
             worksheet.getRow(worksheet.rowCount).font = { bold: true }
        }

        // Response
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        res.setHeader('Content-Disposition', `attachment; filename=BaoCaoCuoiNgay_${concern}_${new Date().getTime()}.xlsx`)
        
        await workbook.xlsx.write(res)
        res.end()
    }
}

export const statisticsService = new StatisticsService()
