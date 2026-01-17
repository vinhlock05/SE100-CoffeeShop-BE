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
  { id: 1, name: 'Theo phần trăm' },      // Percentage discount
  { id: 2, name: 'Theo số tiền' },        // Fixed amount discount
  { id: 3, name: 'Đồng giá' },            // Fixed price
  { id: 4, name: 'Tặng món' }             // Gift items (Buy X Get Y)
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

// Finance categories - matching FE Finance.tsx allCategories
const FINANCE_CATEGORIES = [
  // Thu (Receipt) - typeId: 1
  { name: 'Tiền khách trả', typeId: 1 },
  { name: 'Thu nợ', typeId: 1 },
  { name: 'Vay', typeId: 1 },
  { name: 'Đầu tư', typeId: 1 },
  { name: 'Thu khác', typeId: 1 },
  // Chi (Payment) - typeId: 2
  { name: 'Tiền trả NCC', typeId: 2 },
  { name: 'Tiền lương', typeId: 2 },
  { name: 'Điện nước', typeId: 2 },
  { name: 'Tiền thuê mặt bằng', typeId: 2 },
  { name: 'Trả nợ', typeId: 2 },
  { name: 'Chi khác', typeId: 2 },
]

export async function seedFinanceCategories() {
  const results = []
  for (const category of FINANCE_CATEGORIES) {
    // Check if exists by name and typeId
    const existing = await prisma.financeCategory.findFirst({
      where: { name: category.name, typeId: category.typeId }
    })
    
    if (existing) {
      results.push(existing)
    } else {
      const result = await prisma.financeCategory.create({
        data: category
      })
      results.push(result)
    }
  }
  return results
}
