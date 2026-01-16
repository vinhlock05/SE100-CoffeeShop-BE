import { prisma } from '../config/database'
import { generateCode } from '../utils/helpers'

/**
 * Seed promotions with 4 types:
 * 1. Theo phần trăm (Percentage) - has minOrderValue, discountValue, maxDiscount
 * 2. Theo số tiền (Fixed Amount) - has minOrderValue, discountValue
 * 3. Đồng giá (Fixed Price) - has minOrderValue, discountValue (as the fixed price)
 * 4. Tặng món (Gift) - has minOrderValue AND/OR buyQuantity/getQuantity
 * 
 * Codes will be auto-generated as KM001, KM002, etc.
 */

export async function seedPromotions() {
    const results = []

    // Get all items for applicable scope
    const items = await prisma.inventoryItem.findMany({
        where: { deletedAt: null },
        take: 10
    })

    const categories = await prisma.category.findMany({
        where: { deletedAt: null },
        take: 3
    })

    const customers = await prisma.customer.findMany({
        where: { deletedAt: null },
        take: 5
    })

    const customerGroups = await prisma.customerGroup.findMany({
        where: { deletedAt: null },
        take: 2
    })

    // ========================================
    // 1. THEO PHẦN TRĂM (Percentage Discount)
    // Specific items + specific category
    // ========================================
    let percentagePromo = await prisma.promotion.create({
        data: {
            code: 'TEMP',
            name: 'Giảm 20% cho đơn hàng từ 200K',
            description: 'Giảm 20% tối đa 50K cho đơn hàng từ 200K',
            typeId: 1,
            discountValue: 20,
            minOrderValue: 200000,
            maxDiscount: 50000,
            startDateTime: new Date('2026-01-01'),
            endDateTime: new Date('2026-12-31'),
            maxTotalUsage: 100,
            maxUsagePerCustomer: 3,
            isActive: true,
            // Boolean flags
            applyToAllItems: false,
            applyToAllCategories: false,
            applyToAllCombos: false,
            applyToAllCustomers: false,
            applyToAllCustomerGroups: false
        }
    })
    percentagePromo = await prisma.promotion.update({
        where: { id: percentagePromo.id },
        data: { code: generateCode('KM', percentagePromo.id) }
    })
    results.push(percentagePromo)

    if (items.length > 0) {
        await prisma.promotionApplicableItem.createMany({
            data: items.slice(0, 3).map(item => ({
                promotionId: percentagePromo.id,
                itemId: item.id
            })),
            skipDuplicates: true
        })
    }

    if (categories.length > 0) {
        await prisma.promotionApplicableCategory.createMany({
            data: categories.slice(0, 1).map(cat => ({
                promotionId: percentagePromo.id,
                categoryId: cat.id
            })),
            skipDuplicates: true
        })
    }

    // ========================================
    // 2. THEO SỐ TIỀN (Fixed Amount Discount)
    // Apply to ALL items, specific customer group
    // ========================================
    let fixedAmountPromo = await prisma.promotion.create({
        data: {
            code: 'TEMP',
            name: 'Giảm 50K cho đơn hàng từ 300K',
            description: 'Giảm ngay 50K cho đơn hàng từ 300K trở lên',
            typeId: 2,
            discountValue: 50000,
            minOrderValue: 300000,
            startDateTime: new Date('2026-01-01'),
            endDateTime: new Date('2026-06-30'),
            maxTotalUsage: 200,
            maxUsagePerCustomer: 5,
            isActive: true,
            // Boolean flags - ALL items, specific group, members only
            applyToAllItems: true,
            applyToAllCategories: false,
            applyToAllCombos: false,
            applyToAllCustomers: false,
            applyToAllCustomerGroups: false,
            applyToWalkIn: false  // Members only
        }
    })
    fixedAmountPromo = await prisma.promotion.update({
        where: { id: fixedAmountPromo.id },
        data: { code: generateCode('KM', fixedAmountPromo.id) }
    })
    results.push(fixedAmountPromo)

    if (customerGroups.length > 0) {
        await prisma.promotionApplicableCustomerGroup.createMany({
            data: customerGroups.slice(0, 1).map(group => ({
                promotionId: fixedAmountPromo.id,
                customerGroupId: group.id
            })),
            skipDuplicates: true
        })
    }

    // ========================================
    // 3. ĐỒNG GIÁ (Fixed Price)
    // Specific items, ALL customers (including walk-in)
    // ========================================
    let fixedPricePromo = await prisma.promotion.create({
        data: {
            code: 'TEMP',
            name: 'Đồng giá 99K cho tất cả đồ uống',
            description: 'Tất cả đồ uống chỉ 99K - Chương trình Valentine',
            typeId: 3,
            discountValue: 99000,
            minOrderValue: 0,
            startDateTime: new Date('2026-02-01'),
            endDateTime: new Date('2026-02-14'),
            maxTotalUsage: 500,
            isActive: true,
            // Boolean flags - Specific items, ALL customers (members + walk-in)
            applyToAllItems: false,
            applyToAllCategories: false,
            applyToAllCombos: false,
            applyToAllCustomers: true,
            applyToAllCustomerGroups: false,
            applyToWalkIn: true  // Everyone can use
        }
    })
    fixedPricePromo = await prisma.promotion.update({
        where: { id: fixedPricePromo.id },
        data: { code: generateCode('KM', fixedPricePromo.id) }
    })
    results.push(fixedPricePromo)

    if (items.length > 0) {
        await prisma.promotionApplicableItem.createMany({
            data: items.slice(0, 5).map(item => ({
                promotionId: fixedPricePromo.id,
                itemId: item.id
            })),
            skipDuplicates: true
        })
    }

    // ========================================
    // 4A. TẶNG MÓN - Theo giá trị đơn hàng
    // ALL categories
    // ========================================
    let giftByOrderPromo = await prisma.promotion.create({
        data: {
            code: 'TEMP',
            name: 'Tặng bánh ngọt khi mua từ 500K',
            description: 'Mua từ 500K tặng ngay 1 bánh ngọt',
            typeId: 4,
            minOrderValue: 500000,
            getQuantity: 1,
            startDateTime: new Date('2026-01-01'),
            endDateTime: new Date('2026-12-31'),
            maxTotalUsage: 300,
            maxUsagePerCustomer: 2,
            isActive: true,
            // Boolean flags - ALL categories, members only
            applyToAllItems: false,
            applyToAllCategories: true,
            applyToAllCombos: false,
            applyToAllCustomers: false,
            applyToAllCustomerGroups: false,
            applyToWalkIn: false  // Members only
        }
    })
    giftByOrderPromo = await prisma.promotion.update({
        where: { id: giftByOrderPromo.id },
        data: { code: generateCode('KM', giftByOrderPromo.id) }
    })
    results.push(giftByOrderPromo)

    if (items.length > 2) {
        await prisma.promotionGiftItem.createMany({
            data: items.slice(5, 7).map(item => ({
                promotionId: giftByOrderPromo.id,
                itemId: item.id
            })),
            skipDuplicates: true
        })
    }

    // ========================================
    // 4B. TẶNG MÓN - Mua X tặng Y
    // Specific items, specific customers (no maxUsagePerCustomer)
    // ========================================
    let buyXGetYPromo = await prisma.promotion.create({
        data: {
            code: 'TEMP',
            name: 'Mua 2 tặng 1 - Cà phê',
            description: 'Mua 2 ly cà phê bất kỳ tặng 1 ly cùng loại',
            typeId: 4,
            buyQuantity: 2,
            getQuantity: 1,
            requireSameItem: true,
            startDateTime: new Date('2026-01-01'),
            endDateTime: new Date('2026-03-31'),
            maxTotalUsage: 1000,
            isActive: true,
            // Boolean flags
            applyToAllItems: false,
            applyToAllCategories: false,
            applyToAllCombos: false,
            applyToAllCustomers: false,
            applyToAllCustomerGroups: false
        }
    })
    buyXGetYPromo = await prisma.promotion.update({
        where: { id: buyXGetYPromo.id },
        data: { code: generateCode('KM', buyXGetYPromo.id) }
    })
    results.push(buyXGetYPromo)

    if (items.length > 0) {
        await prisma.promotionApplicableItem.createMany({
            data: items.slice(0, 3).map(item => ({
                promotionId: buyXGetYPromo.id,
                itemId: item.id
            })),
            skipDuplicates: true
        })

        await prisma.promotionGiftItem.createMany({
            data: items.slice(0, 3).map(item => ({
                promotionId: buyXGetYPromo.id,
                itemId: item.id
            })),
            skipDuplicates: true
        })
    }

    if (customers.length > 0) {
        await prisma.promotionApplicableCustomer.createMany({
            data: customers.slice(0, 2).map(customer => ({
                promotionId: buyXGetYPromo.id,
                customerId: customer.id
            })),
            skipDuplicates: true
        })
    }

    // ========================================
    // 4C. TẶNG MÓN - Kết hợp cả minOrderValue VÀ buyQuantity
    // Specific items, ALL customer groups
    // ========================================
    let comboConditionPromo = await prisma.promotion.create({
        data: {
            code: 'TEMP',
            name: 'Mua 3 ly từ 200K tặng 1 ly',
            description: 'Mua 3 ly bất kỳ từ 200K trở lên tặng 1 ly cùng loại',
            typeId: 4, // Tặng món
            minOrderValue: 200000, // Tối thiểu 200K
            buyQuantity: 3, // Mua 3
            getQuantity: 1, // Tặng 1
            requireSameItem: false, // Mua 3 bất kỳ
            startDateTime: new Date('2026-01-01'),
            endDateTime: new Date('2026-06-30'),
            maxTotalUsage: 500,
            maxUsagePerCustomer: 2,
            isActive: true,
            // Boolean flags - Specific items, ALL customer groups (members only)
            applyToAllItems: false,
            applyToAllCategories: false,
            applyToAllCombos: false,
            applyToAllCustomers: false,
            applyToAllCustomerGroups: true,
            applyToWalkIn: false  // Members only (all groups)
        }
    })
    comboConditionPromo = await prisma.promotion.update({
        where: { id: comboConditionPromo.id },
        data: { code: generateCode('KM', comboConditionPromo.id) }
    })
    results.push(comboConditionPromo)

    // Add applicable items
    if (items.length > 0) {
        await prisma.promotionApplicableItem.createMany({
            data: items.slice(0, 5).map(item => ({
                promotionId: comboConditionPromo.id,
                itemId: item.id
            })),
            skipDuplicates: true
        })

        // Gift items
        await prisma.promotionGiftItem.createMany({
            data: items.slice(0, 5).map(item => ({
                promotionId: comboConditionPromo.id,
                itemId: item.id
            })),
            skipDuplicates: true
        })
    }

    return results
}
