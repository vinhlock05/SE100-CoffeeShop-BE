import { prisma } from '../config/database'

// Item types
const ITEM_TYPES = [
  { name: 'ready_made' },
  { name: 'composite' },
  { name: 'ingredient' }
]

// Finance types
const FINANCE_TYPES = [
  { id: 1, name: 'Thu' },
  { id: 2, name: 'Chi' }
]

// Promotion types
const PROMOTION_TYPES = [
  { id: 1, name: 'Giảm giá phần trăm' },
  { id: 2, name: 'Giảm giá cố định' },
  { id: 3, name: 'Mua X tặng Y' },
  { id: 4, name: 'Giảm giá theo sản phẩm' }
]

export async function seedItemTypes() {
  const results = []
  for (const type of ITEM_TYPES) {
    const result = await prisma.itemType.upsert({
      where: { name: type.name },
      update: {},
      create: type
    })
    results.push(result)
  }
  return results
}

export async function seedFinanceTypes() {
  const results = []
  for (const type of FINANCE_TYPES) {
    const result = await prisma.financeType.upsert({
      where: { id: type.id },
      update: { name: type.name },
      create: type
    })
    results.push(result)
  }
  return results
}

export async function seedPromotionTypes() {
  const results = []
  for (const type of PROMOTION_TYPES) {
    const result = await prisma.promotionType.upsert({
      where: { id: type.id },
      update: { name: type.name },
      create: type
    })
    results.push(result)
  }
  return results
}
