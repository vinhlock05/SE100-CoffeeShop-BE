import { prisma } from '../config/database'

/**
 * Seed default customer groups
 */
export async function seedCustomerGroups() {
    const groups = [
        {
            code: 'NKH001',
            name: 'Khách thường',
            description: 'Nhóm khách hàng mặc định',
            priority: 0,
            minSpend: 0,
            minOrders: 0,
            windowMonths: 12
        },
        {
            code: 'NKH002',
            name: 'Khách VIP',
            description: 'Khách hàng VIP - Chi tiêu từ 5 triệu, tối thiểu 10 đơn trong 12 tháng',
            priority: 10,
            minSpend: 5000000,
            minOrders: 10,
            windowMonths: 12
        },
        {
            code: 'NKH003',
            name: 'Khách VVIP',
            description: 'Khách hàng VVIP - Chi tiêu từ 20 triệu, tối thiểu 30 đơn trong 12 tháng',
            priority: 20,
            minSpend: 20000000,
            minOrders: 30,
            windowMonths: 12
        }
    ]

    const result = []
    for (const group of groups) {
        const created = await prisma.customerGroup.upsert({
            where: { name: group.name },
            update: {},
            create: group
        })
        result.push(created)
    }

    return result
}
