import { prisma } from '../config/database'

// Import seed functions from separate files
import { seedItemTypes, seedFinanceTypes, seedPromotionTypes } from './types.seed'
import { seedPermissions, seedRoles, seedUsers } from './auth.seed'
import { seedCategories, seedUnits, seedInventoryItems } from './inventory.seed'
import { seedTables } from './table.seed'
import { seedCustomerGroups } from './customerGroup.seed'
import { seedCustomers } from './customer.seed'

/**
 * Seed initial data for the application
 * This function is called on every server startup
 * Uses upsert to check if data exists before seeding
 */
export async function seedInitialData() {
  console.log('🌱 Starting seed...')

  // === System Types ===
  const itemTypes = await seedItemTypes()
  console.log(`✅ Seeded ${itemTypes.length} item types`)

  const financeTypes = await seedFinanceTypes()
  console.log(`✅ Seeded ${financeTypes.length} finance types`)

  const promotionTypes = await seedPromotionTypes()
  console.log(`✅ Seeded ${promotionTypes.length} promotion types`)

  // === Auth & Permissions ===
  const permissions = await seedPermissions()
  console.log(`✅ Seeded ${permissions.length} permissions`)

  const roles = await seedRoles()
  console.log(`✅ Seeded ${roles.length} roles`)

  const users = await seedUsers()
  console.log(`✅ Seeded ${users.length} users`)

  // === Inventory ===
  const categories = await seedCategories()
  console.log(`✅ Seeded ${categories.length} categories`)

  const units = await seedUnits()
  console.log(`✅ Seeded ${units.length} units`)

  const inventoryItems = await seedInventoryItems()
  console.log(`✅ Seeded ${inventoryItems.length} inventory items`)

  // Seed Tables and Areas
  const tables = await seedTables()
  console.log(`✅ Seeded ${tables.length} tables in ${tables.filter((t: any) => t.areaId).length} areas`)

  // === Customer Groups ===
  const customerGroups = await seedCustomerGroups()
  console.log(`✅ Seeded ${customerGroups.length} customer groups`)

  // === Customers ===
  const customers = await seedCustomers()
  console.log(`✅ Seeded ${customers.length} customers`)

  console.log('🌱 Seed completed!')
}

// Export for direct execution (npm run db:seed)
if (require.main === module) {
  seedInitialData()
    .catch((e) => {
      console.error('❌ Seed failed:', e)
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}
