import { IsDateString, IsEnum, IsOptional, IsString, IsArray, IsInt } from 'class-validator'
import { Type } from 'class-transformer'

export enum StatisticsConcern {
    SALES = 'sales',
    REVENUE_EXPENSES = 'revenue_expenses',
    INVENTORY = 'inventory'
}

// Base DTO for all end-of-day statistics
export class EndOfDayBaseDto {
    @IsEnum(StatisticsConcern)
    concern!: StatisticsConcern

    @IsDateString()
    startDate!: string

    @IsDateString()
    endDate!: string
}

// Sales concern DTO
export class SalesStatisticsDto extends EndOfDayBaseDto {
    @IsOptional()
    @IsString()
    customerSearch?: string // Search by code, name, or phone

    @IsOptional()
    @IsArray()
    @IsInt({ each: true })
    @Type(() => Number)
    staffIds?: number[] // Filter by staff IDs (null/undefined/empty = all)

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    paymentMethods?: string[] // Filter by payment methods (null/undefined/empty = all)
}

// Revenue/Expenses concern DTO
export class RevenueExpensesStatisticsDto extends EndOfDayBaseDto {
    @IsOptional()
    @IsString()
    customerSearch?: string // Search by person name, phone

    @IsOptional()
    @IsArray()
    @IsInt({ each: true })
    @Type(() => Number)
    staffIds?: number[] // Filter by creator staff IDs

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    paymentMethods?: string[]

    @IsOptional()
    @IsArray()
    @IsInt({ each: true })
    @Type(() => Number)
    categoryIds?: number[] // Filter by finance category IDs (transaction types)
}

// Inventory concern DTO
export class InventoryStatisticsDto extends EndOfDayBaseDto {
    @IsOptional()
    @IsString()
    productSearch?: string // Search by product code or name

    @IsOptional()
    @IsArray()
    @IsInt({ each: true })
    @Type(() => Number)
    categoryIds?: number[] // Filter by product category IDs
}

// Response DTOs

export interface SalesStatisticsResponse {
    invoices: {
        orderCode: string
        completedAt: Date
        customer: {
            id: number
            code: string
            name: string
            phone: string
        } | null
        items: {
            productCode: string
            productName: string
            quantity: number
            unitPrice: number
            totalPrice: number
        }[]
        totalAmount: number
        paymentMethod: string | null
        staff: {
            id: number
            code: string
            name: string
            role: string
        } | null
    }[]
}

export interface RevenueExpensesStatisticsResponse {
    transactions: {
        code: string
        category: {
            id: number
            name: string
            type: string // 'Thu' or 'Chi'
        }
        personReceiving: string | null // Person name or customer name
        creator: {
            id: number
            code: string
            name: string
        } | null
        amount: number
        transactionDate: Date
        paymentMethod: string | null
    }[]
}

export interface InventoryStatisticsResponse {
    products: {
        productCode: string
        productName: string
        categoryName: string | null
        saleDate: Date | null
        quantitySold: number
        revenue: number
        quantityReturned: number
        returnAmount: number
        netRevenue: number
    }[]
    totals: {
        totalProducts: number
        totalQuantitySold: number
        totalRevenue: number
        totalQuantityReturned: number
        totalReturnAmount: number
        totalNetRevenue: number
    }
}
