import cron from 'node-cron'
import { prisma } from '~/config/database'
import { customerService } from './customer.service'
import { InventorySaleStatus } from '~/enums/inventory.enum'

class CronService {
    /**
     * Initialize all cron jobs
     */
    init() {
        this.scheduleCustomerGroupDowngradeCheck()
        this.scheduleProductStatusCheck()
        console.log('✅ Cron jobs initialized')
    }

    /**
     * Daily check for customer group downgrades
     * Runs every day at 2:00 AM
     */
    private scheduleCustomerGroupDowngradeCheck() {
        cron.schedule('0 2 * * *', async () => {
            console.log('🔄 Running customer group downgrade check...')

            try {
                const customers = await prisma.customer.findMany({
                    where: {
                        deletedAt: null,
                        isActive: true
                    },
                    select: {
                        id: true,
                        code: true
                    }
                })

                let downgradeCount = 0

                for (const customer of customers) {
                    try {
                        await customerService.assignCustomerGroup(customer.id)
                        downgradeCount++
                    } catch (error) {
                        console.error(`Error checking customer ${customer.code}:`, error)
                    }
                }

                console.log(`✅ Customer group downgrade check completed. Checked ${downgradeCount} customers.`)
            } catch (error) {
                console.error('❌ Error in customer group downgrade check:', error)
            }
        })

        console.log('📅 Scheduled: Customer group downgrade check (Daily at 2:00 AM)')
    }

    /**
     * Manual trigger for customer group downgrade check
     */
    async runCustomerGroupDowngradeCheck() {
        console.log('🔄 Manually running customer group downgrade check...')

        const customers = await prisma.customer.findMany({
            where: {
                deletedAt: null,
                isActive: true
            },
            select: {
                id: true,
                code: true
            }
        })

        let downgradeCount = 0

        for (const customer of customers) {
            try {
                await customerService.assignCustomerGroup(customer.id)
                downgradeCount++
            } catch (error) {
                console.error(`Error checking customer ${customer.code}:`, error)
            }
        }

        console.log(`✅ Manual check completed. Checked ${downgradeCount} customers.`)
        return { message: 'Check completed', customersChecked: downgradeCount }
    }

    /**
     * Daily check to update product statuses (HOT, SLOW, SELLING)
     * Runs every day at 3:00 AM
     */
    private scheduleProductStatusCheck() {
        cron.schedule('0 3 * * *', async () => {
            console.log('🔄 Running product status check (Hot/Slow/Selling)...')
            await this.runProductStatusCheck()
        })
        console.log('📅 Scheduled: Product status check (Daily at 3:00 AM)')
    }

    /**
     * Manual trigger for product status update
     * - HOT: Top 20% selling items in last 30 days
     * - SLOW: No sales in last 30 days (and created > 7 days ago)
     * - SELLING: Default
     * - ignore PAUSED items
     */
    async runProductStatusCheck() {
        try {
            console.log('--- Starting Product Status Analysis ---')
            
            // 1. Get current date and 30 days ago
            const now = new Date()
            const thirtyDaysAgo = new Date(now)
            thirtyDaysAgo.setDate(now.getDate() - 30)

            // 2. Fetch all active items (excluding deleted)
            const allItems = await prisma.inventoryItem.findMany({
                where: { deletedAt: null },
                select: { id: true, productStatus: true, createdAt: true, name: true }
            })

            // Filter out items that should be ignored manually (PAUSED)
            const itemsToProcess = allItems.filter(i => i.productStatus !== InventorySaleStatus.PAUSED)

            if (itemsToProcess.length === 0) {
                console.log('No items to process.')
                return { message: 'No items to process', stats: null }
            }

            // 3. Aggregate Sales Quantity for last 30 days
            const salesStats = await prisma.orderItem.groupBy({
                by: ['itemId'],
                where: {
                    createdAt: { gte: thirtyDaysAgo },
                    itemId: { in: itemsToProcess.map(i => i.id) }
                },
                _sum: {
                    quantity: true
                }
            })

            const salesMap = new Map<number, number>()
            salesStats.forEach(stat => {
                if (stat.itemId && stat._sum.quantity) {
                    salesMap.set(stat.itemId, stat._sum.quantity)
                }
            })

            // 4. Determine Thresholds
            const itemsWithSales = itemsToProcess.map(item => ({
                ...item,
                qty: salesMap.get(item.id) || 0
            }))

            // Sort by quantity descending
            itemsWithSales.sort((a, b) => b.qty - a.qty)

            const totalItems = itemsWithSales.length
            const top20PercentCount = Math.ceil(totalItems * 0.2)
            
            // 5. Categorize and Update
            let hotCount = 0
            let slowCount = 0
            let sellingCount = 0
            
            const updates = []

            for (let i = 0; i < totalItems; i++) {
                const item = itemsWithSales[i]
                let newStatus = InventorySaleStatus.SELLING

                // Rule 1: HOT (Top 20% passed and has sales > 0)
                if (i < top20PercentCount && item.qty > 0) {
                    newStatus = InventorySaleStatus.HOT
                    hotCount++
                } 
                // Rule 2: SLOW (No sales in 30 days AND created > 7 days ago)
                else if (item.qty === 0) {
                    // Check creation date to give grace period for new items
                    const daysSinceCreation = (now.getTime() - new Date(item.createdAt).getTime()) / (1000 * 3600 * 24)
                    if (daysSinceCreation > 7) {
                        newStatus = InventorySaleStatus.SLOW
                        slowCount++
                    } else {
                         // New items (< 7 days) default to SELLING
                         sellingCount++
                    }
                } 
                // Rule 3: SELLING (Rest)
                else {
                    sellingCount++
                }

                // Push update if status changed
                if (item.productStatus !== newStatus) {
                    updates.push(
                        prisma.inventoryItem.update({
                            where: { id: item.id },
                            data: { productStatus: newStatus }
                        })
                    )
                }
            }

            // 6. Execute Batch Update
            if (updates.length > 0) {
                await prisma.$transaction(updates)
            }

            console.log(`✅ Product Status Update Completed.`)
            console.log(`   - Processed: ${totalItems} items`)
            console.log(`   - New HOT: ${hotCount} (Top 20%)`)
            console.log(`   - New SLOW: ${slowCount} (No sales 30d)`)
            console.log(`   - Updated ${updates.length} items.`)

            return { 
                message: 'Product status check completed', 
                stats: { total: totalItems, hot: hotCount, slow: slowCount, updated: updates.length } 
            }

        } catch (error) {
            console.error('❌ Error in product status check:', error)
            return { message: 'Error occurred', error }
        }
    }
}

export const cronService = new CronService()
