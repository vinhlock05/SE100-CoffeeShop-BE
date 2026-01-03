import { prisma } from '../config/database'

/**
 * Seed initial data for the application
 * Run with: npm run db:seed
 */
export async function seedInitialData() {
  console.log('🌱 Starting seed...')

  // Seed ItemTypes
  const itemTypes = await seedItemTypes()
  console.log(`✅ Seeded ${itemTypes.length} item types`)

  // Seed FinanceTypes
  const financeTypes = await seedFinanceTypes()
  console.log(`✅ Seeded ${financeTypes.length} finance types`)

  // Seed PromotionTypes
  const promotionTypes = await seedPromotionTypes()
  console.log(`✅ Seeded ${promotionTypes.length} promotion types`)

  // Seed default Role
  const roles = await seedRoles()
  console.log(`✅ Seeded ${roles.length} roles`)

  console.log('🌱 Seed completed!')
}

async function seedItemTypes() {
  const itemTypes = [
    { name: 'ready_made' },
    { name: 'composite' },
    { name: 'ingredient' }
  ]

  const results = []
  for (const type of itemTypes) {
    const result = await prisma.itemType.upsert({
      where: { name: type.name },
      update: {},
      create: type
    })
    results.push(result)
  }
  return results
}

async function seedFinanceTypes() {
  const financeTypes = [
    { id: 1, name: 'Thu' },
    { id: 2, name: 'Chi' }
  ]

  const results = []
  for (const type of financeTypes) {
    const result = await prisma.financeType.upsert({
      where: { id: type.id },
      update: { name: type.name },
      create: type
    })
    results.push(result)
  }
  return results
}

async function seedPromotionTypes() {
  const promotionTypes = [
    { id: 1, name: 'Giảm giá phần trăm' },
    { id: 2, name: 'Giảm giá cố định' },
    { id: 3, name: 'Mua X tặng Y' },
    { id: 4, name: 'Giảm giá theo sản phẩm' }
  ]

  const results = []
  for (const type of promotionTypes) {
    const result = await prisma.promotionType.upsert({
      where: { id: type.id },
      update: { name: type.name },
      create: type
    })
    results.push(result)
  }
  return results
}

async function seedRoles() {
  const roles = [
    { name: 'admin', description: 'Quản trị viên hệ thống', isSystem: true },
    { name: 'manager', description: 'Quản lý cửa hàng', isSystem: true },
    { name: 'cashier', description: 'Thu ngân', isSystem: false },
    { name: 'barista', description: 'Pha chế', isSystem: false },
    { name: 'waiter', description: 'Phục vụ', isSystem: false }
  ]

  const results = []
  for (const role of roles) {
    const result = await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: role
    })
    results.push(result)
  }
  return results
}

// Run seed if this file is executed directly
seedInitialData()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
