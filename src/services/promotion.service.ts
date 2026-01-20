import { BadRequestError } from '~/core'
import { prisma } from '../config/database'
import { InventoryItem } from '@prisma/client'
import { PromotionQueryDto } from '~/dtos/promotion'
import { generateCode } from '~/utils/helpers'

// Internal type for order items
export type OrderItemInput = {
    itemId: number
    quantity: number
    price: number
}

export class PromotionService {
    /**
     * Get all promotions with filters and pagination
     */
    async getAll(query: PromotionQueryDto) {
        const { page = 1, limit = 20 } = query
        const skip = (page - 1) * limit

        // Build where conditions
        const where: any = {
            deletedAt: null
        }

        if (query.search) {
            where.OR = [
                { name: { contains: query.search, mode: 'insensitive' } },
                { code: { contains: query.search, mode: 'insensitive' } },
                { description: { contains: query.search, mode: 'insensitive' } }
            ]
        }

        if (query.isActive !== undefined) {
            where.isActive = query.isActive
        }

        if (query.typeId) {
            where.typeId = Number(query.typeId)
        }

        // Build orderBy
        const orderBy = query.sort
            ? (Object.entries(query.sort).map(([key, value]) => ({ [key]: (value as string).toLowerCase() })) as any)
            : { createdAt: 'desc' }

        const [promotions, total] = await Promise.all([
            prisma.promotion.findMany({
                where,
                orderBy,
                skip,
                take: limit,
                include: {
                    type: true
                }
            }),
            prisma.promotion.count({ where })
        ])

        return {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            promotions: promotions.map(({ type, typeId, ...p }) => ({
                ...p,
                typeId,
                typeName: type.name,
                discountValue: p.discountValue ? Number(p.discountValue) : null,
                minOrderValue: p.minOrderValue ? Number(p.minOrderValue) : null,
                maxDiscount: p.maxDiscount ? Number(p.maxDiscount) : null
            }))
        }
    }

    /**
     * Check if a customer can use a promotion
     * customerId can be null for walk-in customers
     */
    async canUsePromotion(
        promotionId: number,
        customerId: number | null
    ) {
        const promotion = await prisma.promotion.findUnique({
            where: { id: promotionId },
            include: {
                promotionApplicableCustomers: true,
                promotionApplicableCustomerGroups: true
            }
        })

        if (!promotion) {
            return { eligible: false, reason: 'Mã khuyến mãi không tồn tại' }
        }

        if (!promotion.isActive) {
            return { eligible: false, reason: 'Mã khuyến mãi đã bị vô hiệu hóa' }
        }

        // Check time range
        const now = new Date()
        if (promotion.startDateTime && now < promotion.startDateTime) {
            return { eligible: false, reason: 'Mã khuyến mãi chưa bắt đầu' }
        }
        if (promotion.endDateTime && now > promotion.endDateTime) {
            return { eligible: false, reason: 'Mã khuyến mãi đã hết hạn' }
        }

        // Check total usage limit
        if (promotion.maxTotalUsage) {
            const totalUsed = await prisma.promotionUsage.count({
                where: { promotionId }
            })

            if (totalUsed >= promotion.maxTotalUsage) {
                return { eligible: false, reason: 'Mã khuyến mãi đã hết lượt sử dụng' }
            }
        }

        // Check customer-specific usage limit (skip for walk-in customers)
        if (promotion.maxUsagePerCustomer && customerId) {
            const customerUsed = await prisma.promotionUsage.count({
                where: { promotionId, customerId }
            })
            if (customerUsed >= promotion.maxUsagePerCustomer) {
                return { eligible: false, reason: 'Bạn đã hết lượt sử dụng khuyến mãi này' }
            }
        }

        // Check customer scope
        const hasCustomerScope = promotion.promotionApplicableCustomers.length > 0 ||
            promotion.promotionApplicableCustomerGroups.length > 0

        if (hasCustomerScope) {
            // Walk-in customers cannot use promotions with customer scope
            if (!customerId) {
                return { eligible: false, reason: 'Khuyến mãi chỉ dành cho khách hàng thành viên' }
            }

            // Check if customer is in applicable list
            const isApplicable = await this.isCustomerApplicable(promotion, customerId)
            if (!isApplicable) {
                return { eligible: false, reason: 'Bạn không thuộc đối tượng áp dụng khuyến mãi này' }
            }
        }

        return { eligible: true, promotion }
    }

    /**
     * Check if customer is in promotion's applicable scope
     */
    private async isCustomerApplicable(
        promotion: any,
        customerId: number | null
    ): Promise<boolean> {
        const isWalkIn = customerId === null

        // Check if walk-in customers are allowed
        if (isWalkIn && !promotion.applyToWalkIn) {
            // Walk-in not allowed
            return false
        }

        // If walk-in and applyToWalkIn = true, check if there are member restrictions
        if (isWalkIn && promotion.applyToWalkIn) {
            // Walk-in allowed, no further checks needed
            return true
        }

        // For members (customerId !== null)
        // Check applyToAllCustomers flag (all members)
        if (promotion.applyToAllCustomers) {
            return true
        }

        // Check applyToAllCustomerGroups flag (all groups)
        if (promotion.applyToAllCustomerGroups) {
            return true
        }

        // If both flags false and both lists empty → no customer scope (apply to all members + walk-in if flag set)
        if (!promotion.applyToAllCustomers &&
            !promotion.applyToAllCustomerGroups &&
            promotion.promotionApplicableCustomers.length === 0 &&
            promotion.promotionApplicableCustomerGroups.length === 0) {
            return true
        }

        // Check specific customers
        if (promotion.promotionApplicableCustomers.length > 0) {
            const hasCustomer = promotion.promotionApplicableCustomers.some(
                (pc: any) => pc.customerId === customerId
            )
            if (hasCustomer) return true
        }

        // Check customer groups
        if (promotion.promotionApplicableCustomerGroups.length > 0) {
            const customer = await prisma.customer.findUnique({
                where: { id: customerId! }
            })

            if (!customer) return false

            const hasGroup = promotion.promotionApplicableCustomerGroups.some(
                (pg: any) => pg.customerGroupId === customer.groupId
            )

            if (hasGroup) return true
        }

        return false
    }

    /**
     * Get applicable items from order items
     * 
     * Product Scope Logic:
     * - Scope is inferred from which relations are populated:
     *   - If applicableComboIds exists: This is a COMBO promotion
     *   - Otherwise: This is an ITEM/CATEGORY promotion
     * 
     * - ITEM/CATEGORY promotions:
     *   - If applicableItemIds exists: check if order item is in the list
     *   - If applicableCategoryIds exists: check if order item's category is in the list
     *   - An item matches if EITHER its itemId OR its categoryId matches
     * 
     * - COMBO promotions:
     *   - Items are not applicable for combo promotions
     *   - Combos are checked separately in applyPromotion
     * 
     * Example: Promotion has applicableCategoryIds = [1] (Cà phê category)
     *   - Order has item A (categoryId = 1) → APPLICABLE
     *   - Order has item B (categoryId = 2) → NOT APPLICABLE
     *   - Even if item A is not in applicableItemIds, it still applies because its category matches
     */
    private async getApplicableItems(
        promotionId: number,
        orderItems: OrderItemInput[]
    ): Promise<OrderItemInput[]> {
        const promotion = await prisma.promotion.findUnique({
            where: { id: promotionId },
            include: {
                promotionApplicableItems: true,
                promotionApplicableCategories: true,
                promotionApplicableCombos: true
            }
        })

        if (!promotion) return []

        // Auto-detect if this is a combo promotion
        // Combo promotion if: applyToAllCombos flag OR has combo IDs
        const isComboPromotion = promotion.applyToAllCombos ||
            (promotion.promotionApplicableCombos && promotion.promotionApplicableCombos.length > 0)

        if (isComboPromotion) {
            return [] // Combo promotions don't apply to individual items
        }

        // Check if applies to all items
        if (promotion.applyToAllItems && promotion.applyToAllCategories) {
            return orderItems // Both flags = all items
        }

        // If both flags false and both lists empty → no items applicable
        if (!promotion.applyToAllItems &&
            !promotion.applyToAllCategories &&
            promotion.promotionApplicableItems.length === 0 &&
            promotion.promotionApplicableCategories.length === 0) {
            return []
        }

        // Filter items that match based on flags or arrays
        const applicableItems: OrderItemInput[] = []

        for (const orderItem of orderItems) {
            let isApplicable = false

            // Check 1: applyToAllItems flag
            if (promotion.applyToAllItems) {
                isApplicable = true
            }
            // Check 2: Specific item match
            else if (promotion.promotionApplicableItems.length > 0) {
                const hasItem = promotion.promotionApplicableItems.some(
                    (pi: any) => pi.itemId === orderItem.itemId
                )
                if (hasItem) {
                    isApplicable = true
                }
            }

            // Check 3: applyToAllCategories flag (if not already matched)
            if (!isApplicable && promotion.applyToAllCategories) {
                isApplicable = true
            }
            // Check 4: Specific category match (if not already matched)
            else if (!isApplicable && promotion.promotionApplicableCategories.length > 0) {
                const item = await prisma.inventoryItem.findUnique({
                    where: { id: orderItem.itemId }
                })

                if (item?.categoryId) {
                    const hasCategory = promotion.promotionApplicableCategories.some(
                        (pc: any) => pc.categoryId === item.categoryId
                    )
                    if (hasCategory) {
                        isApplicable = true
                    }
                }
            }

            if (isApplicable) {
                applicableItems.push(orderItem)
            }
        }

        return applicableItems
    }

    /**
     * Calculate applicable subtotal
     */
    private calculateSubtotal(items: OrderItemInput[]): number {
        return items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    }

    /**
     * Format promotion response for API
     * - Flatten type object to typeId + typeName
     * - Extract nested items/categories/combos/customers from junction tables
     * - Convert Decimal fields to numbers
     */
    private formatPromotionResponse(promotion: any) {
        if (!promotion) return null

        const {
            id,
            code,
            name,
            description,
            type,
            typeId,
            discountValue,
            minOrderValue,
            maxDiscount,
            promotionApplicableItems,
            promotionApplicableCategories,
            promotionApplicableCombos,
            promotionApplicableCustomers,
            promotionApplicableCustomerGroups,
            promotionGiftItems,
            ...rest
        } = promotion

        return {
            // Basic info first
            id,
            code,
            name,
            description,
            // Type info
            typeId,
            typeName: type?.name,
            // Decimal fields as numbers
            discountValue: discountValue ? Number(discountValue) : null,
            minOrderValue: minOrderValue ? Number(minOrderValue) : null,
            maxDiscount: maxDiscount ? Number(maxDiscount) : null,
            // Rest of fields
            ...rest,
            // Arrays last
            applicableItems: promotionApplicableItems?.map((pi: any) => pi.item) || [],
            applicableCategories: promotionApplicableCategories?.map((pc: any) => pc.category) || [],
            applicableCombos: promotionApplicableCombos?.map((pc: any) => pc.combo) || [],
            applicableCustomers: promotionApplicableCustomers?.map((pc: any) => pc.customer) || [],
            applicableCustomerGroups: promotionApplicableCustomerGroups?.map((pg: any) => pg.customerGroup) || [],
            giftItems: promotionGiftItems?.map((gi: any) => gi.item) || []
        }
    }

    /**
     * Apply promotion to an order
     * Fetches order and orderItems from DB using orderId
     * 
     * @param promotionId - ID of the promotion
     * @param orderId - ID of the order
     */
    async applyPromotion(
        promotionId: number,
        orderId: number,
        selectedGifts?: Array<{itemId: number, quantity: number}>
    ) {
        // Fetch order with items from DB
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                orderItems: true
            }
        })

        if (!order) {
            throw new BadRequestError({ message: 'Đơn hàng không tồn tại' })
        }

        // Check if order already has a promotion applied
        if (order.promotionId) {
            throw new BadRequestError({ 
                message: 'Đơn hàng đã áp dụng khuyến mãi. Vui lòng hủy khuyến mãi cũ trước khi áp dụng khuyến mãi mới.' 
            })
        }

        // customerId can be null for walk-in customers
        const customerId = order.customerId

        // Convert orderItems to OrderItemInput format (only items, not combos)
        const orderItems: OrderItemInput[] = order.orderItems
            .filter(item => item.itemId !== null)
            .map(item => ({
                itemId: item.itemId!,
                quantity: item.quantity,
                price: Number(item.unitPrice)
            }))

        // Check eligibility (customerId can be null for walk-in customers)
        const eligibility = await this.canUsePromotion(promotionId, customerId)
        if (!eligibility.eligible || !eligibility.promotion) {
            throw new BadRequestError({ message: eligibility.reason || 'Cannot use promotion' })
        }

        const promotion = eligibility.promotion

        // Calculate total order value (for minOrderValue check)
        const orderTotal = this.calculateSubtotal(orderItems)

        // Check minimum order value
        if (promotion.minOrderValue && orderTotal < promotion.minOrderValue.toNumber()) {
            throw new BadRequestError({
                message: `Đơn hàng tối thiểu ${promotion.minOrderValue.toNumber()}đ`
            })
        }

        // Detect if this is a combo promotion
        const applicableCombos = await prisma.promotionApplicableCombo.findMany({
            where: { promotionId },
            select: { comboId: true }
        })
        const applicableComboIds = applicableCombos.map(c => c.comboId)
        const isComboPromotion = promotion.applyToAllCombos || applicableComboIds.length > 0

        let applicableSubtotal = 0
        let applicableItems: OrderItemInput[] = []
        let applicableComboCount = 0  // For combo fixed price calculation

        if (isComboPromotion) {
            // --- COMBO PROMOTION LOGIC ---
            // Get unique comboIds from order that are in applicable scope
            const comboIdsInOrder = [...new Set(
                order.orderItems
                    .filter(item => item.comboId !== null)
                    .map(item => item.comboId!)
            )]

            // Filter to only applicable combos
            const applicableComboIdsInOrder = comboIdsInOrder.filter(cId => 
                promotion.applyToAllCombos || applicableComboIds.includes(cId)
            )

            if (applicableComboIdsInOrder.length === 0) {
                throw new BadRequestError({
                    message: 'Đơn hàng không có combo nào thuộc phạm vi khuyến mãi'
                })
            }

            applicableComboCount = applicableComboIdsInOrder.length

            // Fetch combo records to get comboPrice
            const combos = await prisma.combo.findMany({
                where: { id: { in: applicableComboIdsInOrder } },
                select: { id: true, comboPrice: true }
            })

            // Calculate applicableSubtotal using comboPrice from Combo records
            applicableSubtotal = combos.reduce((sum: number, combo) => {
                return sum + Number(combo.comboPrice)
            }, 0)
        } else {
            // --- ITEM/CATEGORY PROMOTION LOGIC ---
            applicableItems = await this.getApplicableItems(promotionId, orderItems)

            if (applicableItems.length === 0 && promotion.typeId !== 4) {
                throw new BadRequestError({
                    message: 'Không có sản phẩm nào thuộc phạm vi áp dụng khuyến mãi'
                })
            }

            applicableSubtotal = this.calculateSubtotal(applicableItems)
        }

        let discountAmount = 0
        let finalPrice: number | undefined
        let giftItems: InventoryItem[] | undefined
        let giftCount: number | undefined

        // Calculate discount based on promotion type
        switch (promotion.typeId) {
            case 1: // Theo phần trăm
                if (!promotion.discountValue) break

                discountAmount = (applicableSubtotal * promotion.discountValue.toNumber()) / 100

                // Apply max discount limit
                if (promotion.maxDiscount) {
                    discountAmount = Math.min(discountAmount, promotion.maxDiscount.toNumber())
                }

                // Cap at applicable subtotal
                discountAmount = Math.min(discountAmount, applicableSubtotal)
                break

            case 2: // Theo số tiền
                if (!promotion.discountValue) break

                discountAmount = promotion.discountValue.toNumber()
                discountAmount = Math.min(discountAmount, applicableSubtotal)
                break

            case 3: // Đồng giá
                if (!promotion.discountValue) break

                const fixedPrice = promotion.discountValue.toNumber()
                
                // Calculate quantity: combo count for combo promotion, item qty for item promotion
                let totalApplicableQty: number
                if (isComboPromotion) {
                    totalApplicableQty = applicableComboCount
                } else {
                    totalApplicableQty = applicableItems.reduce((sum: number, item) => sum + item.quantity, 0)
                }

                finalPrice = fixedPrice * totalApplicableQty
                discountAmount = applicableSubtotal - finalPrice
                discountAmount = Math.max(0, discountAmount)
                break

            case 4: // Tặng món
                let canGift = false
                giftCount = 0

                // Case 1: Both minOrderValue AND buyQuantity
                if (promotion.minOrderValue && promotion.buyQuantity) {
                    const hasMinOrder = orderTotal >= promotion.minOrderValue.toNumber()

                    if (promotion.requireSameItem) {
                        let totalGiftCount = 0
                        for (const item of applicableItems) {
                            const itemGiftCount = Math.floor(item.quantity / promotion.buyQuantity) * (promotion.getQuantity || 1)
                            totalGiftCount += itemGiftCount
                        }

                        if (hasMinOrder && totalGiftCount > 0) {
                            canGift = true
                            giftCount = totalGiftCount
                        }
                    } else {
                        const totalApplicableQty = applicableItems.reduce((sum, item) => sum + item.quantity, 0)
                        const hasBuyQuantity = totalApplicableQty >= promotion.buyQuantity

                        if (hasMinOrder && hasBuyQuantity) {
                            canGift = true
                            giftCount = Math.floor(totalApplicableQty / promotion.buyQuantity) * (promotion.getQuantity || 1)
                        }
                    }
                }
                // Case 2: Only minOrderValue
                else if (promotion.minOrderValue && !promotion.buyQuantity) {
                    if (orderTotal >= promotion.minOrderValue.toNumber()) {
                        canGift = true
                        giftCount = promotion.getQuantity || 1
                    }
                }
                // Case 3: Only buyQuantity
                else if (promotion.buyQuantity && !promotion.minOrderValue) {
                    if (promotion.requireSameItem) {
                        let totalGiftCount = 0
                        for (const item of applicableItems) {
                            const itemGiftCount = Math.floor(item.quantity / promotion.buyQuantity) * (promotion.getQuantity || 1)
                            totalGiftCount += itemGiftCount
                        }

                        if (totalGiftCount > 0) {
                            canGift = true
                            giftCount = totalGiftCount
                        }
                    } else {
                        const totalApplicableQty = applicableItems.reduce((sum, item) => sum + item.quantity, 0)

                        if (totalApplicableQty >= promotion.buyQuantity) {
                            canGift = true
                            giftCount = Math.floor(totalApplicableQty / promotion.buyQuantity) * (promotion.getQuantity || 1)
                        }
                    }
                }

                if (!canGift) {
                    throw new BadRequestError({ message: 'Chưa đủ điều kiện để nhận quà tặng' })
                }

                // Handle gift items
                if (selectedGifts && selectedGifts.length > 0) {
                    // User selected gifts - validate and add
                    const totalSelectedQty = selectedGifts.reduce((sum, g) => sum + g.quantity, 0)
                    if (totalSelectedQty !== giftCount) {
                        throw new BadRequestError({ 
                            message: `Số lượng món tặng phải là ${giftCount}, đã chọn ${totalSelectedQty}` 
                        })
                    }

                    // Get promotion gift items to validate selection
                    const promotionWithGifts = await prisma.promotion.findUnique({
                        where: { id: promotionId },
                        include: { promotionGiftItems: { include: { item: true } } }
                    })
                    const validGiftIds = promotionWithGifts?.promotionGiftItems.map(pg => pg.itemId) || []

                    // Validate all selected gifts are in the promotion's gift list
                    for (const gift of selectedGifts) {
                        if (!validGiftIds.includes(gift.itemId)) {
                            throw new BadRequestError({ 
                                message: `Món #${gift.itemId} không nằm trong danh sách quà tặng của KM này` 
                            })
                        }
                    }

                    // Add selected gift items to order
                    const giftItemDetails = await prisma.inventoryItem.findMany({
                        where: { id: { in: selectedGifts.map(g => g.itemId) } }
                    })

                    await prisma.orderItem.createMany({
                        data: selectedGifts.map(gift => {
                            const itemDetail = giftItemDetails.find(i => i.id === gift.itemId)
                            return {
                                orderId,
                                itemId: gift.itemId,
                                name: `${itemDetail?.name || 'Món tặng'} (Tặng)`,
                                quantity: gift.quantity,
                                unitPrice: 0,
                                totalPrice: 0,
                                discountAmount: 0,
                                status: 'pending',
                                isTopping: false,
                                notes: `Quà tặng từ KM #${promotionId}`
                            }
                        })
                    })

                    giftItems = giftItemDetails
                } else {
                    // Auto-select gifts (legacy behavior)
                    const promotionWithGifts = await prisma.promotion.findUnique({
                        where: { id: promotionId },
                        include: {
                            promotionGiftItems: {
                                include: { item: true },
                                take: giftCount
                            }
                        }
                    })

                    giftItems = promotionWithGifts?.promotionGiftItems.map((pg) => pg.item)
                    
                    // Add gift items to the order as OrderItems with price = 0
                    if (giftItems && giftItems.length > 0) {
                        await prisma.orderItem.createMany({
                            data: giftItems.map((gift) => ({
                                orderId,
                                itemId: gift.id,
                                name: `${gift.name} (Tặng)`,
                                quantity: 1,
                                unitPrice: 0,
                                totalPrice: 0,
                                discountAmount: 0,
                                status: 'pending',
                                isTopping: false,
                                notes: `Quà tặng từ KM #${promotionId}`
                            }))
                        })
                    }
                }

                discountAmount = 0
                break

            default:
                throw new BadRequestError({ message: 'Loại khuyến mãi không hợp lệ' })
        }

        // Record usage (only if customerId exists - walk-in without tracking)
        if (customerId) {
            await prisma.promotionUsage.create({
                data: {
                    promotionId,
                    customerId,
                    orderId
                }
            })
        }

        // Update usage counter
        await prisma.promotion.update({
            where: { id: promotionId },
            data: {
                currentTotalUsage: { increment: 1 }
            }
        })

        // Update order with promotion info and recalculate totalAmount
        const newTotalAmount = Number(order.subtotal) - discountAmount
        await prisma.order.update({
            where: { id: orderId },
            data: {
                promotionId,
                discountAmount,
                totalAmount: Math.max(0, newTotalAmount) // Ensure non-negative
            }
        })

        return {
            discountAmount,
            applicableSubtotal,
            finalPrice,
            giftItems,
            giftCount,
            newTotalAmount: Math.max(0, newTotalAmount)
        }
    }

    /**
     * Remove promotion from an order
     * Deletes the promotion usage record, decrements counter, and resets order
     * 
     * @param promotionId - ID of the promotion
     * @param orderId - ID of the order
     */
    async unapplyPromotion(
        promotionId: number,
        orderId: number
    ) {
        // Get order to check promotion and get subtotal
        const order = await prisma.order.findUnique({
            where: { id: orderId }
        })

        if (!order) {
            throw new BadRequestError({ message: 'Đơn hàng không tồn tại' })
        }

        // Check if this promotion is applied to the order
        if (order.promotionId !== promotionId) {
            throw new BadRequestError({ message: 'Khuyến mãi này chưa được áp dụng cho đơn hàng' })
        }

        // Delete usage record if exists (customer tracked)
        const usage = await prisma.promotionUsage.findFirst({
            where: {
                promotionId,
                orderId
            }
        })

        if (usage) {
            await prisma.promotionUsage.delete({
                where: { id: usage.id }
            })
        }

        // Decrement usage counter
        await prisma.promotion.update({
            where: { id: promotionId },
            data: {
                currentTotalUsage: { decrement: 1 }
            }
        })

        // Reset order - remove promotion and recalculate totalAmount
        await prisma.order.update({
            where: { id: orderId },
            data: {
                promotionId: null,
                discountAmount: 0,
                totalAmount: order.subtotal // Reset to original subtotal
            }
        })

        return {
            message: 'Đã hủy áp dụng khuyến mãi',
            newTotalAmount: Number(order.subtotal)
        }
    }

    /**
     * Get promotion by ID with full details and statistics
     */
    async getPromotionById(promotionId: number) {
        const promotion = await prisma.promotion.findUnique({
            where: { id: promotionId },
            include: {
                type: true,
                promotionApplicableItems: {
                    include: { item: true }
                },
                promotionApplicableCategories: {
                    include: { category: true }
                },
                promotionApplicableCombos: {
                    include: { combo: true }
                },
                promotionApplicableCustomers: {
                    include: { customer: true }
                },
                promotionApplicableCustomerGroups: {
                    include: { customerGroup: true }
                },
                promotionGiftItems: {
                    include: { item: true }
                }
            }
        })

        if (!promotion) {
            throw new BadRequestError({ message: 'Promotion not found' })
        }

        // Get statistics
        const totalUsages = await prisma.promotionUsage.count({
            where: { promotionId }
        })

        const uniqueCustomers = await prisma.promotionUsage.groupBy({
            by: ['customerId'],
            where: { promotionId }
        })

        // Destructure and flatten all relations
        const {
            type,
            typeId,
            promotionApplicableItems,
            promotionApplicableCategories,
            promotionApplicableCombos,
            promotionApplicableCustomers,
            promotionApplicableCustomerGroups,
            promotionGiftItems,
            ...promotionData
        } = promotion

        return {
            promotion: {
                ...promotionData,
                typeId,
                typeName: type.name,
                discountValue: promotionData.discountValue ? Number(promotionData.discountValue) : null,
                minOrderValue: promotionData.minOrderValue ? Number(promotionData.minOrderValue) : null,
                maxDiscount: promotionData.maxDiscount ? Number(promotionData.maxDiscount) : null,
                applicableItems: promotionApplicableItems.map(pai => pai.item),
                applicableCategories: promotionApplicableCategories.map(pac => pac.category),
                applicableCombos: promotionApplicableCombos.map(pac => pac.combo),
                applicableCustomers: promotionApplicableCustomers.map(pac => pac.customer),
                applicableCustomerGroups: promotionApplicableCustomerGroups.map(pacg => pacg.customerGroup),
                giftItems: promotionGiftItems.map(pgi => pgi.item)
            },
            totalUsages, // tổng lượt sử dụng KM
            uniqueCustomers: uniqueCustomers.length, // số lượng khách hàng riêng biệt đã sử dụng KM
            remainingUsages: promotion.maxTotalUsage // số lượt sử dụng còn lại
                ? promotion.maxTotalUsage - totalUsages
                : null
        }
    }

    /**
     * Get available promotions for an order
     * Returns list of promotions with eligibility status
     * Fetches order details from DB using orderId
     * customerId can be null for walk-in customers
     */
    async getAvailablePromotions(customerId: number | null, orderId: number) {
        // Fetch order from DB
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                orderItems: true
            }
        })

        if (!order) {
            throw new BadRequestError({ message: 'Đơn hàng không tồn tại' })
        }

        // Use customerId from order if not provided (for consistency)
        const effectiveCustomerId = customerId ?? order.customerId

        // Calculate order total from orderItems
        const orderTotal = order.orderItems.reduce(
            (sum, item) => sum + (Number(item.unitPrice) * item.quantity),
            0
        )

        // Get unique combo IDs from order
        const orderComboIds = [...new Set(
            order.orderItems
                .filter(item => item.comboId !== null)
                .map(item => item.comboId!)
        )]

        // Get unique item IDs from order (excluding toppings)
        const orderItemIds = [...new Set(
            order.orderItems
                .filter(item => item.itemId !== null && !item.isTopping)
                .map(item => item.itemId!)
        )]

        // Get categories of order items
        const orderItemsWithCategory = await prisma.inventoryItem.findMany({
            where: { id: { in: orderItemIds } },
            select: { id: true, categoryId: true }
        })
        const orderCategoryIds = [...new Set(
            orderItemsWithCategory
                .filter(item => item.categoryId !== null)
                .map(item => item.categoryId!)
        )]

        // Get all active promotions
        const promotions = await prisma.promotion.findMany({
            where: {
                isActive: true,
                deletedAt: null
            },
            include: {
                type: true,
                promotionApplicableCustomers: true,
                promotionApplicableCustomerGroups: true,
                promotionApplicableCombos: true,
                promotionApplicableItems: true,
                promotionApplicableCategories: true,
                promotionGiftItems: {
                    include: { item: { select: { id: true, name: true, sellingPrice: true } } }
                }
            },
            orderBy: { id: 'asc' }
        })

        const now = new Date()

        // Check each promotion
        const results = await Promise.all(
            promotions.map(async (promotion) => {
                const { type, ...promotionData } = promotion

                // Check eligibility
                let canApply = true
                let reason: string | null = null

                // 1. Check time range
                if (promotion.startDateTime && now < promotion.startDateTime) {
                    canApply = false
                    reason = 'Chưa đến thời gian áp dụng'
                } else if (promotion.endDateTime && now > promotion.endDateTime) {
                    canApply = false
                    reason = 'Đã hết hạn'
                }

                // 2. Check total usage
                if (canApply && promotion.maxTotalUsage) {
                    const totalUsed = await prisma.promotionUsage.count({
                        where: { promotionId: promotion.id }
                    })
                    if (totalUsed >= promotion.maxTotalUsage) {
                        canApply = false
                        reason = 'Đã hết lượt sử dụng'
                    }
                }

                // 3. Promotions with per-customer limit require member account
                if (canApply && promotion.maxUsagePerCustomer && !effectiveCustomerId) {
                    canApply = false
                    reason = 'Khuyến mãi yêu cầu đăng nhập để theo dõi số lượt sử dụng'
                }

                // 4. Check customer usage (only for members)
                if (canApply && promotion.maxUsagePerCustomer && effectiveCustomerId) {
                    const customerUsed = await prisma.promotionUsage.count({
                        where: {
                            promotionId: promotion.id,
                            customerId: effectiveCustomerId
                        }
                    })
                    if (customerUsed >= promotion.maxUsagePerCustomer) {
                        canApply = false
                        reason = 'Bạn đã hết lượt sử dụng'
                    }
                }

                // 5. Check customer scope
                if (canApply) {
                    const isWalkIn = effectiveCustomerId === null

                    // Check if walk-in customers are allowed
                    if (isWalkIn && !promotion.applyToWalkIn) {
                        canApply = false
                        reason = 'Khuyến mãi chỉ dành cho khách hàng thành viên'
                    } else if (!isWalkIn) {
                        // For members, check customer scope
                        const hasCustomerScope = promotion.applyToAllCustomers ||
                            promotion.applyToAllCustomerGroups ||
                            promotion.promotionApplicableCustomers.length > 0 ||
                            promotion.promotionApplicableCustomerGroups.length > 0

                        if (hasCustomerScope) {
                            // Check if member is eligible
                            if (promotion.applyToAllCustomers || promotion.applyToAllCustomerGroups) {
                                // All members can use
                            } else {
                                // Check specific customer
                                const hasCustomer = promotion.promotionApplicableCustomers.some(
                                    (pc: any) => pc.customerId === effectiveCustomerId
                                )

                                if (!hasCustomer) {
                                    // Check customer group
                                    const customer = await prisma.customer.findUnique({
                                        where: { id: effectiveCustomerId }
                                    })

                                    const hasGroup = customer && promotion.promotionApplicableCustomerGroups.some(
                                        (pg: any) => pg.customerGroupId === customer.groupId
                                    )

                                    if (!hasGroup) {
                                        canApply = false
                                        reason = 'Không thuộc đối tượng áp dụng'
                                    }
                                }
                            }
                        }
                    }
                }

                // 6. Check min order value
                if (canApply && promotion.minOrderValue && orderTotal < Number(promotion.minOrderValue)) {
                    canApply = false
                    reason = `Đơn hàng tối thiểu ${Number(promotion.minOrderValue).toLocaleString()}đ`
                }

                // 7. Check product scope (combo vs item/category)
                if (canApply) {
                    const isComboPromotion = promotion.applyToAllCombos || 
                        (promotion.promotionApplicableCombos && promotion.promotionApplicableCombos.length > 0)

                    if (isComboPromotion) {
                        // --- COMBO PROMOTION ---
                        if (orderComboIds.length === 0) {
                            canApply = false
                            reason = 'Đơn hàng không có combo'
                        } else if (!promotion.applyToAllCombos) {
                            const applicableComboIds = promotion.promotionApplicableCombos.map((pc: any) => pc.comboId)
                            const hasApplicableCombo = orderComboIds.some(cId => applicableComboIds.includes(cId))
                            
                            if (!hasApplicableCombo) {
                                canApply = false
                                reason = 'Đơn hàng không có combo thuộc khuyến mãi này'
                            }
                        }
                    } else {
                        // --- ITEM/CATEGORY PROMOTION ---
                        // If not apply to all, check specific scopes
                        if (!promotion.applyToAllItems && !promotion.applyToAllCategories) {
                            const hasApplicableItems = promotion.promotionApplicableItems && 
                                promotion.promotionApplicableItems.length > 0
                            const hasApplicableCategories = promotion.promotionApplicableCategories && 
                                promotion.promotionApplicableCategories.length > 0

                            if (hasApplicableItems || hasApplicableCategories) {
                                let hasMatch = false

                                // Check item match
                                if (hasApplicableItems) {
                                    const applicableItemIds = promotion.promotionApplicableItems.map((pi: any) => pi.itemId)
                                    hasMatch = orderItemIds.some(id => applicableItemIds.includes(id))
                                }

                                // Check category match (if not already matched)
                                if (!hasMatch && hasApplicableCategories) {
                                    const applicableCatIds = promotion.promotionApplicableCategories.map((pc: any) => pc.categoryId)
                                    hasMatch = orderCategoryIds.some(id => applicableCatIds.includes(id))
                                }

                                if (!hasMatch) {
                                    canApply = false
                                    reason = 'Đơn hàng không có sản phẩm thuộc khuyến mãi này'
                                }
                            }
                        }
                    }
                }

                // Calculate giftCount for type 4 (gift promotions)
                let giftCount: number | undefined
                let giftItems: Array<{id: number, name: string, price: number}> | undefined
                let discountPreview: number | undefined
                let applicableSubtotal: number | undefined
                
                if (canApply && promotion.typeId === 4) {
                    // Get applicable items for gift calculation
                    const orderItems = order.orderItems
                        .filter(item => item.itemId !== null && !item.isTopping)
                        .map(item => ({
                            itemId: item.itemId!,
                            quantity: item.quantity,
                            price: Number(item.unitPrice)
                        }))
                    
                    const applicableItems = await this.getApplicableItems(promotion.id, orderItems)
                    
                    // Calculate giftCount based on conditions
                    if (promotion.buyQuantity) {
                        if (promotion.requireSameItem) {
                            let totalGiftCount = 0
                            for (const item of applicableItems) {
                                totalGiftCount += Math.floor(item.quantity / promotion.buyQuantity) * (promotion.getQuantity || 1)
                            }
                            giftCount = totalGiftCount
                        } else {
                            const totalQty = applicableItems.reduce((sum, item) => sum + item.quantity, 0)
                            giftCount = Math.floor(totalQty / promotion.buyQuantity) * (promotion.getQuantity || 1)
                        }
                    } else {
                        giftCount = promotion.getQuantity || 1
                    }
                    
                    // Get gift items from promotion
                    giftItems = promotion.promotionGiftItems?.map((pg: any) => ({
                        id: pg.item.id,
                        name: pg.item.name,
                        price: Number(pg.item.sellingPrice)
                    })) || []
                    
                    if (giftCount === 0) {
                        canApply = false
                        reason = 'Chưa đủ điều kiện số lượng món cần mua'
                    }
                }
                
                // Calculate discountPreview for type 1, 2, 3 (discount promotions)
                if (canApply && [1, 2, 3].includes(promotion.typeId)) {
                    const orderItems = order.orderItems
                        .filter(item => item.itemId !== null && !item.isTopping)
                        .map(item => ({
                            itemId: item.itemId!,
                            quantity: item.quantity,
                            price: Number(item.unitPrice)
                        }))
                    
                    const applicableItems = await this.getApplicableItems(promotion.id, orderItems)
                    applicableSubtotal = this.calculateSubtotal(applicableItems)
                    
                    const discountValue = Number(promotion.discountValue || 0)
                    
                    if (promotion.typeId === 1) {
                        // Percentage discount
                        discountPreview = Math.round(applicableSubtotal * discountValue / 100)
                        if (promotion.maxDiscount) {
                            discountPreview = Math.min(discountPreview, Number(promotion.maxDiscount))
                        }
                    } else if (promotion.typeId === 2) {
                        // Fixed amount discount
                        discountPreview = Math.min(discountValue, applicableSubtotal)
                    } else if (promotion.typeId === 3) {
                        // Fixed price - calculate discount from original price
                        const totalApplicableQty = applicableItems.reduce((sum, item) => sum + item.quantity, 0)
                        const fixedTotal = discountValue * totalApplicableQty
                        discountPreview = Math.max(0, applicableSubtotal - fixedTotal)
                    }
                    
                    // Ensure discount doesn't exceed applicable subtotal
                    discountPreview = Math.min(discountPreview || 0, applicableSubtotal)
                }

                return {
                    id: promotion.id,
                    code: promotion.code,
                    name: promotion.name,
                    description: promotion.description,
                    typeId: promotion.typeId,
                    typeName: type.name,
                    discountValue: promotionData.discountValue ? Number(promotionData.discountValue) : null,
                    minOrderValue: promotionData.minOrderValue ? Number(promotionData.minOrderValue) : null,
                    maxDiscount: promotionData.maxDiscount ? Number(promotionData.maxDiscount) : null,
                    startDateTime: promotion.startDateTime,
                    endDateTime: promotion.endDateTime,
                    canApply,
                    reason,
                    // Type 1, 2, 3: discount preview
                    ...([1, 2, 3].includes(promotion.typeId) && { discountPreview, applicableSubtotal }),
                    // Type 4: gift fields
                    ...(promotion.typeId === 4 && { giftCount, giftItems })
                }
            })
        )

        return results
    }

    /**
     * Create new promotion
     */
    async createPromotion(dto: any) {
        return await prisma.$transaction(async (tx) => {
            // Create with temp code
            const record = await tx.promotion.create({
                data: {
                    code: 'TEMP',
                    name: dto.name,
                    description: dto.description,
                    typeId: dto.typeId,
                    discountValue: dto.discountValue,
                    minOrderValue: dto.minOrderValue,
                    maxDiscount: dto.maxDiscount,
                    buyQuantity: dto.buyQuantity,
                    getQuantity: dto.getQuantity,
                    requireSameItem: dto.requireSameItem,
                    startDateTime: dto.startDateTime ? new Date(dto.startDateTime) : null,
                    endDateTime: dto.endDateTime ? new Date(dto.endDateTime) : null,
                    maxTotalUsage: dto.maxTotalUsage,
                    maxUsagePerCustomer: dto.maxUsagePerCustomer,
                    isActive: dto.isActive ?? true
                }
            })

            // Update with generated code
            await tx.promotion.update({
                where: { id: record.id },
                data: { code: generateCode('KM', record.id) }
            })

            // Create relations
            if (dto.applicableItemIds?.length > 0) {
                await tx.promotionApplicableItem.createMany({
                    data: dto.applicableItemIds.map((itemId: number) => ({ promotionId: record.id, itemId }))
                })
            }

            if (dto.applicableCategoryIds?.length > 0) {
                await tx.promotionApplicableCategory.createMany({
                    data: dto.applicableCategoryIds.map((categoryId: number) => ({ promotionId: record.id, categoryId }))
                })
            }

            if (dto.applicableComboIds?.length > 0) {
                await tx.promotionApplicableCombo.createMany({
                    data: dto.applicableComboIds.map((comboId: number) => ({ promotionId: record.id, comboId }))
                })
            }

            if (dto.applicableCustomerIds?.length > 0) {
                await tx.promotionApplicableCustomer.createMany({
                    data: dto.applicableCustomerIds.map((customerId: number) => ({ promotionId: record.id, customerId }))
                })
            }

            if (dto.applicableCustomerGroupIds?.length > 0) {
                await tx.promotionApplicableCustomerGroup.createMany({
                    data: dto.applicableCustomerGroupIds.map((customerGroupId: number) => ({ promotionId: record.id, customerGroupId }))
                })
            }

            if (dto.giftItemIds?.length > 0) {
                await tx.promotionGiftItem.createMany({
                    data: dto.giftItemIds.map((itemId: number) => ({ promotionId: record.id, itemId }))
                })
            }

            // Return complete promotion with formatted response
            const result = await tx.promotion.findUnique({
                where: { id: record.id },
                include: {
                    type: true,
                    promotionApplicableItems: { include: { item: true } },
                    promotionApplicableCategories: { include: { category: true } },
                    promotionApplicableCombos: { include: { combo: true } },
                    promotionApplicableCustomers: { include: { customer: true } },
                    promotionApplicableCustomerGroups: { include: { customerGroup: true } },
                    promotionGiftItems: { include: { item: true } }
                }
            })

            return this.formatPromotionResponse(result)
        })
    }

    /**
     * Update promotion by ID
     */
    async updatePromotion(id: number, dto: any) {
        // Check if promotion exists
        const existing = await prisma.promotion.findUnique({
            where: { id, deletedAt: null }
        })

        if (!existing) {
            throw new BadRequestError({ message: 'Promotion not found' })
        }

        // Update in transaction
        return await prisma.$transaction(async (tx) => {
            // Update main promotion data
            await tx.promotion.update({
                where: { id },
                data: {
                    name: dto.name,
                    description: dto.description,
                    typeId: dto.typeId,
                    discountValue: dto.discountValue,
                    minOrderValue: dto.minOrderValue,
                    maxDiscount: dto.maxDiscount,
                    buyQuantity: dto.buyQuantity,
                    getQuantity: dto.getQuantity,
                    requireSameItem: dto.requireSameItem,

                    startDateTime: dto.startDateTime ? new Date(dto.startDateTime) : undefined,
                    endDateTime: dto.endDateTime ? new Date(dto.endDateTime) : undefined,
                    maxTotalUsage: dto.maxTotalUsage,
                    maxUsagePerCustomer: dto.maxUsagePerCustomer,
                    isActive: dto.isActive
                }
            })

            // Update applicable items
            if (dto.applicableItemIds !== undefined) {
                await tx.promotionApplicableItem.deleteMany({ where: { promotionId: id } })
                if (dto.applicableItemIds.length > 0) {
                    await tx.promotionApplicableItem.createMany({
                        data: dto.applicableItemIds.map((itemId: number) => ({ promotionId: id, itemId }))
                    })
                }
            }

            // Update applicable categories
            if (dto.applicableCategoryIds !== undefined) {
                await tx.promotionApplicableCategory.deleteMany({ where: { promotionId: id } })
                if (dto.applicableCategoryIds.length > 0) {
                    await tx.promotionApplicableCategory.createMany({
                        data: dto.applicableCategoryIds.map((categoryId: number) => ({ promotionId: id, categoryId }))
                    })
                }
            }

            // Update applicable combos
            if (dto.applicableComboIds !== undefined) {
                await tx.promotionApplicableCombo.deleteMany({ where: { promotionId: id } })
                if (dto.applicableComboIds.length > 0) {
                    await tx.promotionApplicableCombo.createMany({
                        data: dto.applicableComboIds.map((comboId: number) => ({ promotionId: id, comboId }))
                    })
                }
            }

            // Update applicable customers
            if (dto.applicableCustomerIds !== undefined) {
                await tx.promotionApplicableCustomer.deleteMany({ where: { promotionId: id } })
                if (dto.applicableCustomerIds.length > 0) {
                    await tx.promotionApplicableCustomer.createMany({
                        data: dto.applicableCustomerIds.map((customerId: number) => ({ promotionId: id, customerId }))
                    })
                }
            }

            // Update applicable customer groups
            if (dto.applicableCustomerGroupIds !== undefined) {
                await tx.promotionApplicableCustomerGroup.deleteMany({ where: { promotionId: id } })
                if (dto.applicableCustomerGroupIds.length > 0) {
                    await tx.promotionApplicableCustomerGroup.createMany({
                        data: dto.applicableCustomerGroupIds.map((customerGroupId: number) => ({ promotionId: id, customerGroupId }))
                    })
                }
            }

            // Update gift items
            if (dto.giftItemIds !== undefined) {
                await tx.promotionGiftItem.deleteMany({ where: { promotionId: id } })
                if (dto.giftItemIds.length > 0) {
                    await tx.promotionGiftItem.createMany({
                        data: dto.giftItemIds.map((itemId: number) => ({ promotionId: id, itemId }))
                    })
                }
            }

            // Return complete promotion with formatted response
            const result = await tx.promotion.findUnique({
                where: { id },
                include: {
                    type: true,
                    promotionApplicableItems: { include: { item: true } },
                    promotionApplicableCategories: { include: { category: true } },
                    promotionApplicableCombos: { include: { combo: true } },
                    promotionApplicableCustomers: { include: { customer: true } },
                    promotionApplicableCustomerGroups: { include: { customerGroup: true } },
                    promotionGiftItems: { include: { item: true } }
                }
            })

            return this.formatPromotionResponse(result)
        })
    }

    /**
     * Soft delete promotion
     */
    async deletePromotion(id: number) {
        const existing = await prisma.promotion.findUnique({
            where: { id, deletedAt: null }
        })

        if (!existing) {
            throw new BadRequestError({ message: 'Promotion not found' })
        }

        await prisma.promotion.update({
            where: { id },
            data: { deletedAt: new Date() }
        })
    }

    /**
     * Check if an item is used in any active promotion
     */
    async isItemInActivePromotion(itemId: number): Promise<boolean> {
        const count = await prisma.promotionApplicableItem.count({
            where: {
                itemId,
                promotion: {
                    isActive: true,
                    deletedAt: null
                }
            }
        })
        return count > 0
    }

    /**
     * Check if a category is used in any active promotion
     */
    async isCategoryInActivePromotion(categoryId: number): Promise<boolean> {
        const count = await prisma.promotionApplicableCategory.count({
            where: {
                categoryId,
                promotion: {
                    isActive: true,
                    deletedAt: null
                }
            }
        })
        return count > 0
    }

    /**
     * Check if a combo is used in any active promotion
     */
    async isComboInActivePromotion(comboId: number): Promise<boolean> {
        const count = await prisma.promotionApplicableCombo.count({
            where: {
                comboId,
                promotion: {
                    isActive: true,
                    deletedAt: null
                }
            }
        })
        return count > 0
    }
}

export const promotionService = new PromotionService()
