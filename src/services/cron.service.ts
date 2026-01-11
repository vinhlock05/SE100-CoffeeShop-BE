import cron from 'node-cron'
import { prisma } from '~/config/database'
import { customerService } from './customer.service'

class CronService {
    /**
     * Initialize all cron jobs
     */
    init() {
        this.scheduleCustomerGroupDowngradeCheck()
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
     * Manual trigger for testing
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
}

export const cronService = new CronService()
