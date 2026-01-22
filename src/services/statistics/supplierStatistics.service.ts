import { prisma } from '~/config/database'
import { Prisma } from '@prisma/client'
import ExcelJS from 'exceljs'
import { Response } from 'express'
import { format } from 'date-fns'

class SupplierStatisticsService {
    // ==========================================
    // HELPER METHODS
    // ==========================================

    private buildBaseWhereClause(dto: any): any {
        const startDate = new Date(dto.startDate)
        const endDate = new Date(dto.endDate)

        startDate.setHours(0, 0, 0, 0)
        endDate.setHours(23, 59, 59, 999)

        const where: any = {
            orderDate: { gte: startDate, lte: endDate },
            status: { in: ['completed', 'draft'] }
        }

        if (dto.search) {
            where.supplier = {
                OR: [
                    { name: { contains: dto.search, mode: 'insensitive' } },
                    { code: { contains: dto.search, mode: 'insensitive' } }
                ]
            }
        }

        return where
    }

    // ==========================================
    // PURCHASING CONCERN
    // ==========================================

    async getPurchasingStatistics(dto: any) {
        const displayType = dto.displayType || 'report'

        if (displayType === 'report') {
            return this.getPurchasingReport(dto)
        } else {
            return this.getPurchasingChart(dto)
        }
    }

    private async getPurchasingReport(dto: any) {
        const where = this.buildBaseWhereClause(dto)

        const purchaseOrders = await prisma.purchaseOrder.findMany({
            where,
            include: {
                supplier: true,
                purchaseOrderItems: true
            }
        })

        // Group by supplier
        const supplierMap = new Map<number, any>()

        for (const po of purchaseOrders) {
            const supplierId = po.supplierId

            if (!supplierMap.has(supplierId)) {
                supplierMap.set(supplierId, {
                    code: po.supplier.code,
                    name: po.supplier.name,
                    purchaseCount: 0,
                    totalQuantity: 0,
                    totalValue: 0,
                    returnedQuantity: 0,
                    returnedValue: 0,
                    netValue: 0
                })
            }

            const stats = supplierMap.get(supplierId)!
            stats.purchaseCount += 1
            stats.totalValue += Number(po.totalAmount)
            stats.totalQuantity += po.purchaseOrderItems.reduce((sum, item) => sum + Number(item.quantity), 0)
        }

        const suppliers = Array.from(supplierMap.values()).map(s => ({
            ...s,
            netValue: s.totalValue - s.returnedValue
        }))

        // Calculate totals
        const totals = {
            totalSuppliers: suppliers.length,
            totalQuantity: suppliers.reduce((sum, s) => sum + s.totalQuantity, 0),
            totalValue: suppliers.reduce((sum, s) => sum + s.totalValue, 0),
            totalReturnedQuantity: suppliers.reduce((sum, s) => sum + s.returnedQuantity, 0),
            totalReturnedValue: suppliers.reduce((sum, s) => sum + s.returnedValue, 0),
            totalNetValue: suppliers.reduce((sum, s) => sum + s.netValue, 0)
        }

        return { suppliers, totals }
    }

    private async getPurchasingChart(dto: any) {
        const where = this.buildBaseWhereClause(dto)

        const purchaseOrders = await prisma.purchaseOrder.findMany({
            where,
            include: {
                supplier: true
            }
        })

        // Group by supplier for top 10
        const supplierMap = new Map<number, any>()

        for (const po of purchaseOrders) {
            const supplierId = po.supplierId

            if (!supplierMap.has(supplierId)) {
                supplierMap.set(supplierId, {
                    name: po.supplier.name,
                    value: 0
                })
            }

            const stats = supplierMap.get(supplierId)!
            stats.value += Number(po.totalAmount)
        }

        const data = Array.from(supplierMap.values())
            .sort((a, b) => b.value - a.value)
            .slice(0, 10)

        return { data }
    }

    // ==========================================
    // DEBT CONCERN
    // ==========================================

    async getDebtStatistics(dto: any) {
        const displayType = dto.displayType || 'report'

        if (displayType === 'report') {
            return this.getDebtReport(dto)
        } else {
            return this.getDebtChart(dto)
        }
    }

    private async getDebtReport(dto: any) {
        const startDate = new Date(dto.startDate)
        const endDate = new Date(dto.endDate)
        startDate.setHours(0, 0, 0, 0)
        endDate.setHours(23, 59, 59, 999)

        // 1. Get all suppliers
        const suppliersList = await prisma.supplier.findMany({
            where: {
                deletedAt: null,
                ...(dto.search && {
                    OR: [
                        { name: { contains: dto.search, mode: 'insensitive' } },
                        { code: { contains: dto.search, mode: 'insensitive' } }
                    ]
                })
            }
        })

        // 2. Fetch all movements from AFTER endDate until NOW to backtrack current debt
        // Movements: PurchaseOrder.debtAmount (+) and FinanceTransaction.amount (-)

        const reportData = []

        for (const supplier of suppliersList) {
            // New debt incurred in period (Ghi nợ)
            const purchaseInPeriod = await prisma.purchaseOrder.aggregate({
                where: {
                    supplierId: supplier.id,
                    orderDate: { gte: startDate, lte: endDate },
                    status: { in: ['completed', 'draft'] }
                },
                _sum: {
                    totalAmount: true // Note: KiotViet defines Debit as Total Purchase Value, Credit as Payments
                }
            })

            // Payments made in period (Ghi có)
            const paymentsInPeriod = await prisma.financeTransaction.aggregate({
                where: {
                    personType: 'supplier',
                    personId: supplier.id,
                    transactionDate: { gte: startDate, lte: endDate },
                    status: 'completed'
                },
                _sum: {
                    amount: true
                }
            })

            // Movements AFTER period to backtrack from current totalDebt
            const purchaseAfter = await prisma.purchaseOrder.aggregate({
                where: {
                    supplierId: supplier.id,
                    orderDate: { gt: endDate },
                    status: { in: ['completed', 'draft'] }
                },
                _sum: {
                    totalAmount: true
                }
            })

            const paymentsAfter = await prisma.financeTransaction.aggregate({
                where: {
                    personType: 'supplier',
                    personId: supplier.id,
                    transactionDate: { gt: endDate },
                    status: 'completed'
                },
                _sum: {
                    amount: true
                }
            })

            // Note: Since totalDebt is updated as per PO debtAmount and Payments, 
            // the backtracking logic should mirror those updates.
            const currentDebt = Number(supplier.totalDebt)
            const purchaseAfterCount = Number(purchaseAfter._sum.totalAmount || 0)
            const paymentsAfterCount = Number(paymentsAfter._sum.amount || 0)

            const closingDebt = currentDebt - purchaseAfterCount + paymentsAfterCount
            const incurredDebt = Number(purchaseInPeriod._sum.totalAmount || 0) // Ghi nợ: Giá trị nhập hàng
            const paidAmount = Number(paymentsInPeriod._sum.amount || 0) // Ghi có: Tiền đã trả

            // Wait, if Ghi nợ - Ghi có does not equal change in debt, it's because totalAmount includes paid part.
            // Actually, usually: nợ cuối = nợ đầu + Giá trị nhập - Tiền trả (cho cả đơn cũ và đơn mới).
            const openingDebt = closingDebt - incurredDebt + paidAmount

            reportData.push({
                code: supplier.code,
                name: supplier.name,
                openingDebt,
                incurredDebt,
                paidAmount,
                closingDebt
            })
        }

        const totals = {
            totalOpeningDebt: reportData.reduce((sum, r) => sum + r.openingDebt, 0),
            totalIncurredDebt: reportData.reduce((sum, r) => sum + r.incurredDebt, 0),
            totalPaidAmount: reportData.reduce((sum, r) => sum + r.paidAmount, 0),
            totalClosingDebt: reportData.reduce((sum, r) => sum + r.closingDebt, 0)
        }

        return { suppliers: reportData, totals }
    }

    private async getDebtChart(dto: any) {
        // Top 10 suppliers by current debt
        const suppliers = await prisma.supplier.findMany({
            where: {
                deletedAt: null,
                totalDebt: { gt: 0 }
            },
            orderBy: {
                totalDebt: 'desc'
            },
            take: 10
        })

        const data = suppliers.map(s => ({
            name: s.name,
            debt: Number(s.totalDebt)
        }))

        return { data }
    }

    async exportSupplierReport(dto: any, res: Response) {
        const concern = dto.concern || 'purchasing'
        const startDate = new Date(dto.startDate)
        const endDate = new Date(dto.endDate)
        startDate.setHours(0, 0, 0, 0)
        endDate.setHours(23, 59, 59, 999)

        const workbook = new ExcelJS.Workbook()
        const worksheet = workbook.addWorksheet('Báo cáo nhà cung cấp')

        if (concern === 'purchasing') {
            const report = await this.getPurchasingReport(dto)
            
            worksheet.mergeCells('A1:G1')
            const titleCell = worksheet.getCell('A1')
            titleCell.value = 'BÁO CÁO NHẬP HÀNG THEO NHÀ CUNG CẤP'
            titleCell.font = { bold: true, size: 16 }
            titleCell.alignment = { horizontal: 'center' }

            worksheet.mergeCells('A2:G2')
            const dateCell = worksheet.getCell('A2')
            dateCell.value = `Từ ngày: ${format(startDate, 'dd/MM/yyyy')} - Đến ngày: ${format(endDate, 'dd/MM/yyyy')}`
            dateCell.alignment = { horizontal: 'center' }

            worksheet.columns = [
                { header: 'Mã NCC', key: 'code', width: 15 },
                { header: 'Tên NCC', key: 'name', width: 30 },
                { header: 'Số đơn nhập', key: 'purchaseCount', width: 15 },
                { header: 'Số lượng nhập', key: 'totalQuantity', width: 15 },
                { header: 'Tổng giá trị', key: 'totalValue', width: 20 },
                { header: 'Giá trị trả', key: 'returnedValue', width: 20 },
                { header: 'Giá trị thuần', key: 'netValue', width: 20 }
            ]

            const headers = ['Mã NCC', 'Tên NCC', 'Số đơn nhập', 'Số lượng nhập', 'Tổng giá trị', 'Giá trị trả', 'Giá trị thuần']
            worksheet.addRow([])
            const headerRow = worksheet.addRow(headers)
            headerRow.eachCell(cell => {
                cell.font = { bold: true }
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } }
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
            })

            report.suppliers.forEach(s => {
                const row = worksheet.addRow([s.code, s.name, s.purchaseCount, s.totalQuantity, s.totalValue, s.returnedValue, s.netValue])
                row.getCell(5).numFmt = '#,##0'
                row.getCell(6).numFmt = '#,##0'
                row.getCell(7).numFmt = '#,##0'
                row.eachCell(c => { c.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } } })
            })

            const totalRow = worksheet.addRow(['TỔNG CỘNG', '', report.suppliers.reduce((sum, s) => sum + s.purchaseCount, 0), report.totals.totalQuantity, report.totals.totalValue, report.totals.totalReturnedValue, report.totals.totalNetValue])
            totalRow.font = { bold: true }
            totalRow.getCell(5).numFmt = '#,##0'
            totalRow.getCell(6).numFmt = '#,##0'
            totalRow.getCell(7).numFmt = '#,##0'
            worksheet.mergeCells(`A${totalRow.number}:B${totalRow.number}`)
        } else {
            const report = await this.getDebtReport(dto)
            
            worksheet.mergeCells('A1:F1')
            const titleCell = worksheet.getCell('A1')
            titleCell.value = 'BÁO CÁO CÔNG NỢ NHÀ CUNG CẤP'
            titleCell.font = { bold: true, size: 16 }
            titleCell.alignment = { horizontal: 'center' }

            worksheet.mergeCells('A2:F2')
            const dateCell = worksheet.getCell('A2')
            dateCell.value = `Từ ngày: ${format(startDate, 'dd/MM/yyyy')} - Đến ngày: ${format(endDate, 'dd/MM/yyyy')}`
            dateCell.alignment = { horizontal: 'center' }

            worksheet.columns = [
                { header: 'Mã NCC', key: 'code', width: 15 },
                { header: 'Tên NCC', key: 'name', width: 30 },
                { header: 'Nợ đầu kỳ', key: 'openingDebt', width: 20 },
                { header: 'Ghi nợ (Nhập)', key: 'incurredDebt', width: 20 },
                { header: 'Ghi có (Trả tiền)', key: 'paidAmount', width: 20 },
                { header: 'Nợ cuối kỳ', key: 'closingDebt', width: 20 }
            ]

            const headers = ['Mã NCC', 'Tên NCC', 'Nợ đầu kỳ', 'Ghi nợ (Nhập)', 'Ghi có (Trả tiền)', 'Nợ cuối kỳ']
            worksheet.addRow([])
            const headerRow = worksheet.addRow(headers)
            headerRow.eachCell(cell => {
                cell.font = { bold: true }
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } }
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
            })

            report.suppliers.forEach(s => {
                const row = worksheet.addRow([s.code, s.name, s.openingDebt, s.incurredDebt, s.paidAmount, s.closingDebt])
                row.getCell(3).numFmt = '#,##0'
                row.getCell(4).numFmt = '#,##0'
                row.getCell(5).numFmt = '#,##0'
                row.getCell(6).numFmt = '#,##0'
                row.eachCell(c => { c.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } } })
            })

            const totalRow = worksheet.addRow(['TỔNG CỘNG', '', report.totals.totalOpeningDebt, report.totals.totalIncurredDebt, report.totals.totalPaidAmount, report.totals.totalClosingDebt])
            totalRow.font = { bold: true }
            totalRow.getCell(3).numFmt = '#,##0'
            totalRow.getCell(4).numFmt = '#,##0'
            totalRow.getCell(5).numFmt = '#,##0'
            totalRow.getCell(6).numFmt = '#,##0'
            worksheet.mergeCells(`A${totalRow.number}:B${totalRow.number}`)
        }

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        res.setHeader('Content-Disposition', `attachment; filename=BaoCaoNhaCungCap_${concern}_${format(new Date(), 'ddMMyyyy')}.xlsx`)

        await workbook.xlsx.write(res)
        res.end()
    }
}

export const supplierStatisticsService = new SupplierStatisticsService()
