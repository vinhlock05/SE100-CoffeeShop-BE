import { prisma } from '../config/database'
import { generateCode } from '../utils/helpers'

// Categories for coffee shop
const CATEGORIES = [
  { name: 'Cà phê' },
  { name: 'Trà' },
  { name: 'Đồ uống đóng chai' },
  { name: 'Bánh ngọt' },
  { name: 'Sữa & Kem' },
  { name: 'Syrup & Topping' },
  { name: 'Nguyên liệu thô' },
  { name: 'Bao bì' },
]

// Units for coffee shop
const UNITS = [
  { name: 'Kilogram', symbol: 'kg' },
  { name: 'Gram', symbol: 'g' },
  { name: 'Lít', symbol: 'L' },
  { name: 'Mililít', symbol: 'ml' },
  { name: 'Chai', symbol: 'chai' },
  { name: 'Lon', symbol: 'lon' },
  { name: 'Cái', symbol: 'cái' },
  { name: 'Hộp', symbol: 'hộp' },
  { name: 'Ly', symbol: 'ly' },
  { name: 'Gói', symbol: 'gói' },
]

export async function seedCategories() {
  const results = []
  for (const cat of CATEGORIES) {
    const result = await prisma.category.upsert({
      where: { id: CATEGORIES.indexOf(cat) + 1 },
      update: { name: cat.name },
      create: cat
    })
    results.push(result)
  }
  return results
}

export async function seedUnits() {
  const results = []
  for (const unit of UNITS) {
    const existing = await prisma.unit.findFirst({
      where: { symbol: unit.symbol, deletedAt: null }
    })
    if (existing) {
      results.push(existing)
    } else {
      const result = await prisma.unit.create({
        data: unit
      })
      results.push(result)
    }
  }
  return results
}

export async function seedInventoryItems() {
  // Get references
  const itemTypes = await prisma.itemType.findMany()
  const categories = await prisma.category.findMany({ where: { deletedAt: null } })
  const units = await prisma.unit.findMany({ where: { deletedAt: null } })

  const getItemTypeId = (name: string) => itemTypes.find(t => t.name === name)?.id || 1
  const getCategoryId = (name: string) => categories.find(c => c.name === name)?.id
  const getUnitId = (symbol: string) => units.find(u => u.symbol === symbol)?.id

  // Sample inventory items
  const items = [
    // Ready-made items (drinks, packaged goods)
    { name: 'Coca Cola', itemTypeId: getItemTypeId('ready_made'), categoryId: getCategoryId('Đồ uống đóng chai'), unitId: getUnitId('chai'), sellingPrice: 15000, productStatus: 'selling' },
    { name: 'Pepsi', itemTypeId: getItemTypeId('ready_made'), categoryId: getCategoryId('Đồ uống đóng chai'), unitId: getUnitId('lon'), sellingPrice: 12000, productStatus: 'selling' },
    { name: 'Nước suối Aquafina', itemTypeId: getItemTypeId('ready_made'), categoryId: getCategoryId('Đồ uống đóng chai'), unitId: getUnitId('chai'), sellingPrice: 8000, productStatus: 'selling' },
    { name: 'Bánh Croissant', itemTypeId: getItemTypeId('ready_made'), categoryId: getCategoryId('Bánh ngọt'), unitId: getUnitId('cái'), sellingPrice: 25000, productStatus: 'selling' },
    { name: 'Bánh Tiramisu', itemTypeId: getItemTypeId('ready_made'), categoryId: getCategoryId('Bánh ngọt'), unitId: getUnitId('cái'), sellingPrice: 35000, productStatus: 'hot' },

    // Ingredients (raw materials)
    { name: 'Cà phê hạt Arabica', itemTypeId: getItemTypeId('ingredient'), categoryId: getCategoryId('Nguyên liệu thô'), unitId: getUnitId('kg'), sellingPrice: 420000, minStock: 5, maxStock: 20, productStatus: 'selling' },
    { name: 'Cà phê hạt Robusta', itemTypeId: getItemTypeId('ingredient'), categoryId: getCategoryId('Nguyên liệu thô'), unitId: getUnitId('kg'), sellingPrice: 280000, minStock: 5, maxStock: 20, productStatus: 'selling' },
    { name: 'Sữa tươi Vinamilk', itemTypeId: getItemTypeId('ingredient'), categoryId: getCategoryId('Sữa & Kem'), unitId: getUnitId('L'), sellingPrice: 35000, minStock: 10, maxStock: 50, productStatus: 'selling' },
    { name: 'Sữa đặc Ông Thọ', itemTypeId: getItemTypeId('ingredient'), categoryId: getCategoryId('Sữa & Kem'), unitId: getUnitId('hộp'), sellingPrice: 25000, minStock: 20, maxStock: 100, productStatus: 'selling' },
    { name: 'Kem tươi Anchor', itemTypeId: getItemTypeId('ingredient'), categoryId: getCategoryId('Sữa & Kem'), unitId: getUnitId('hộp'), sellingPrice: 110000, minStock: 5, maxStock: 20, productStatus: 'selling' },
    { name: 'Đường trắng', itemTypeId: getItemTypeId('ingredient'), categoryId: getCategoryId('Nguyên liệu thô'), unitId: getUnitId('kg'), sellingPrice: 25000, minStock: 10, maxStock: 50, productStatus: 'selling' },
    { name: 'Syrup Caramel', itemTypeId: getItemTypeId('ingredient'), categoryId: getCategoryId('Syrup & Topping'), unitId: getUnitId('chai'), sellingPrice: 85000, minStock: 5, maxStock: 15, productStatus: 'selling' },
    { name: 'Syrup Vanilla', itemTypeId: getItemTypeId('ingredient'), categoryId: getCategoryId('Syrup & Topping'), unitId: getUnitId('chai'), sellingPrice: 85000, minStock: 5, maxStock: 15, productStatus: 'selling' },
    { name: 'Trà Ô Long', itemTypeId: getItemTypeId('ingredient'), categoryId: getCategoryId('Trà'), unitId: getUnitId('kg'), sellingPrice: 350000, minStock: 2, maxStock: 10, productStatus: 'selling' },
    { name: 'Trà Lài', itemTypeId: getItemTypeId('ingredient'), categoryId: getCategoryId('Trà'), unitId: getUnitId('kg'), sellingPrice: 280000, minStock: 2, maxStock: 10, productStatus: 'selling' },
    { name: 'Trân châu đen', itemTypeId: getItemTypeId('ingredient'), categoryId: getCategoryId('Syrup & Topping'), unitId: getUnitId('kg'), sellingPrice: 60000, minStock: 5, maxStock: 20, productStatus: 'selling', isTopping: true },
    { name: 'Thạch phô mai', itemTypeId: getItemTypeId('ingredient'), categoryId: getCategoryId('Syrup & Topping'), unitId: getUnitId('kg'), sellingPrice: 80000, minStock: 3, maxStock: 15, productStatus: 'selling', isTopping: true },
    { name: 'Ly nhựa size M', itemTypeId: getItemTypeId('ingredient'), categoryId: getCategoryId('Bao bì'), unitId: getUnitId('cái'), sellingPrice: 800, minStock: 500, maxStock: 2000, productStatus: 'selling' },
    { name: 'Ly nhựa size L', itemTypeId: getItemTypeId('ingredient'), categoryId: getCategoryId('Bao bì'), unitId: getUnitId('cái'), sellingPrice: 1000, minStock: 500, maxStock: 2000, productStatus: 'selling' },
    { name: 'Ống hút giấy', itemTypeId: getItemTypeId('ingredient'), categoryId: getCategoryId('Bao bì'), unitId: getUnitId('cái'), sellingPrice: 500, minStock: 1000, maxStock: 5000, productStatus: 'selling' },

    // Composite items (drinks made from ingredients)
    { name: 'Cà phê đen đá', itemTypeId: getItemTypeId('composite'), categoryId: getCategoryId('Cà phê'), unitId: getUnitId('ly'), sellingPrice: 25000, productStatus: 'selling' },
    { name: 'Cà phê sữa đá', itemTypeId: getItemTypeId('composite'), categoryId: getCategoryId('Cà phê'), unitId: getUnitId('ly'), sellingPrice: 29000, productStatus: 'hot' },
    { name: 'Bạc xỉu', itemTypeId: getItemTypeId('composite'), categoryId: getCategoryId('Cà phê'), unitId: getUnitId('ly'), sellingPrice: 32000, productStatus: 'hot' },
    { name: 'Latte', itemTypeId: getItemTypeId('composite'), categoryId: getCategoryId('Cà phê'), unitId: getUnitId('ly'), sellingPrice: 45000, productStatus: 'selling' },
    { name: 'Cappuccino', itemTypeId: getItemTypeId('composite'), categoryId: getCategoryId('Cà phê'), unitId: getUnitId('ly'), sellingPrice: 45000, productStatus: 'selling' },
    { name: 'Caramel Macchiato', itemTypeId: getItemTypeId('composite'), categoryId: getCategoryId('Cà phê'), unitId: getUnitId('ly'), sellingPrice: 55000, productStatus: 'hot' },
    { name: 'Trà sữa Ô Long', itemTypeId: getItemTypeId('composite'), categoryId: getCategoryId('Trà'), unitId: getUnitId('ly'), sellingPrice: 35000, productStatus: 'selling' },
    { name: 'Trà sữa trân châu', itemTypeId: getItemTypeId('composite'), categoryId: getCategoryId('Trà'), unitId: getUnitId('ly'), sellingPrice: 38000, productStatus: 'hot' },
    { name: 'Trà đào cam sả', itemTypeId: getItemTypeId('composite'), categoryId: getCategoryId('Trà'), unitId: getUnitId('ly'), sellingPrice: 42000, productStatus: 'selling' },
    { name: 'Trà vải', itemTypeId: getItemTypeId('composite'), categoryId: getCategoryId('Trà'), unitId: getUnitId('ly'), sellingPrice: 40000, productStatus: 'selling' },
  ]

  const results = []
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const existing = await prisma.inventoryItem.findFirst({
      where: { name: item.name, deletedAt: null }
    })
    const itemType = itemTypes.find(t => t.id === item.itemTypeId)?.name
    const isStockTracked = itemType === 'ready_made' || itemType === 'ingredient'
    if (existing) {
      results.push(existing)
    } else {
      const result = await prisma.inventoryItem.create({
        data: {
          code: generateCode('SP', i + 1),
          name: item.name,
          itemTypeId: item.itemTypeId,
          categoryId: item.categoryId,
          unitId: item.unitId,
          sellingPrice: item.sellingPrice,
          // 👉 THÊM currentStock
          currentStock: isStockTracked
            ? (item.minStock
                ? item.minStock * 2
                : 100) : 0,
          // 👉 SEED avgUnitCost (approx 30-40% of selling price for ingredients/ready-made)
          avgUnitCost: isStockTracked 
            ? Math.round(Number(item.sellingPrice) * 0.4) 
            : 0, 
          minStock: item.minStock,
          maxStock: item.maxStock,
          productStatus: item.productStatus,
          isTopping: item.isTopping || false,
        }
      })
      results.push(result)
    }
  }

  // Define Recipes
  const recipes = [
    {
      product: 'Cà phê đen đá',
      ingredients: [
        { name: 'Cà phê hạt Robusta', quantity: 0.02, unit: 'kg' }, // 20g
        { name: 'Đường trắng', quantity: 0.01, unit: 'kg' }, // 10g
        { name: 'Ly nhựa size M', quantity: 1, unit: 'cái' },
        { name: 'Ống hút giấy', quantity: 1, unit: 'cái' }
      ]
    },
    {
      product: 'Cà phê sữa đá',
      ingredients: [
        { name: 'Cà phê hạt Robusta', quantity: 0.02, unit: 'kg' },
        { name: 'Sữa đặc Ông Thọ', quantity: 0.03, unit: 'hộp' }, // ~30ml
        { name: 'Ly nhựa size M', quantity: 1, unit: 'cái' },
        { name: 'Ống hút giấy', quantity: 1, unit: 'cái' }
      ]
    },
    {
      product: 'Bạc xỉu',
      ingredients: [
        { name: 'Cà phê hạt Robusta', quantity: 0.01, unit: 'kg' },
        { name: 'Sữa đặc Ông Thọ', quantity: 0.04, unit: 'hộp' },
        { name: 'Sữa tươi Vinamilk', quantity: 0.05, unit: 'L' },
        { name: 'Ly nhựa size M', quantity: 1, unit: 'cái' },
        { name: 'Ống hút giấy', quantity: 1, unit: 'cái' }
      ]
    },
    {
      product: 'Latte', // Hot drink usually, assume cup usage or mug
      ingredients: [
        { name: 'Cà phê hạt Arabica', quantity: 0.018, unit: 'kg' },
        { name: 'Sữa tươi Vinamilk', quantity: 0.2, unit: 'L' },
        { name: 'Ly nhựa size M', quantity: 1, unit: 'cái' } // Takeaway scenario
      ]
    },
    {
      product: 'Cappuccino',
      ingredients: [
        { name: 'Cà phê hạt Arabica', quantity: 0.018, unit: 'kg' },
        { name: 'Sữa tươi Vinamilk', quantity: 0.15, unit: 'L' },
        { name: 'Ly nhựa size M', quantity: 1, unit: 'cái' }
      ]
    },
    {
      product: 'Trà sữa Ô Long',
      ingredients: [
        { name: 'Trà Ô Long', quantity: 0.01, unit: 'kg' },
        { name: 'Sữa đặc Ông Thọ', quantity: 0.02, unit: 'hộp' },
        { name: 'Sữa tươi Vinamilk', quantity: 0.05, unit: 'L' },
        { name: 'Ly nhựa size L', quantity: 1, unit: 'cái' },
        { name: 'Ống hút giấy', quantity: 1, unit: 'cái' }
      ]
    },
    {
      product: 'Trà đào cam sả',
      ingredients: [
        { name: 'Trà Lài', quantity: 0.01, unit: 'kg' },
        { name: 'Syrup Caramel', quantity: 0.02, unit: 'chai' }, // Just example syrup
        { name: 'Ly nhựa size L', quantity: 1, unit: 'cái' },
        { name: 'Ống hút giấy', quantity: 1, unit: 'cái' }
      ]
    }
  ]

  // Seed Recipes
  console.log('Seeding recipes...')
  for (const recipe of recipes) {
    const product = await prisma.inventoryItem.findFirst({ where: { name: recipe.product } })
    if (!product) continue

    for (const ing of recipe.ingredients) {
      const ingredientItem = await prisma.inventoryItem.findFirst({ where: { name: ing.name } })
      if (!ingredientItem) continue

      await prisma.itemIngredient.upsert({
        where: {
          compositeItemId_ingredientItemId: {
             compositeItemId: product.id,
             ingredientItemId: ingredientItem.id
          }
        },
        update: {
          quantity: ing.quantity,
          unit: ing.unit
        },
        create: {
          compositeItemId: product.id,
          ingredientItemId: ingredientItem.id,
          quantity: ing.quantity,
          unit: ing.unit
        }
      })
    }
  }

  return results
}
