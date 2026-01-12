import { prisma } from '../config/database'
import { Gender } from '~/enums'

/**
 * Seed sample customers
 */
export async function seedCustomers() {
    // Get customer groups first
    const groups = await prisma.customerGroup.findMany({
        orderBy: { priority: 'asc' }
    })

    if (groups.length === 0) {
        console.log('⚠️  No customer groups found. Skipping customer seeding.')
        return []
    }

    const defaultGroup = groups[0] // Khách thường
    const vipGroup = groups[1] // Khách VIP
    const vvipGroup = groups[2] // Khách VVIP

    const customers = [
        {
            code: 'KH001',
            name: 'Nguyễn Văn An',
            gender: Gender.MALE,
            phone: '0901234567',
            address: '123 Nguyễn Huệ',
            city: 'TP. Hồ Chí Minh',
            groupId: defaultGroup.id,
            totalOrders: 5,
            totalSpent: 1500000
        },
        {
            code: 'KH002',
            name: 'Trần Thị Bình',
            gender: Gender.FEMALE,
            phone: '0902345678',
            address: '456 Lê Lợi',
            city: 'TP. Hồ Chí Minh',
            groupId: vipGroup?.id || defaultGroup.id,
            totalOrders: 15,
            totalSpent: 7500000
        },
        {
            code: 'KH003',
            name: 'Lê Văn Cường',
            gender: Gender.MALE,
            phone: '0903456789',
            address: '789 Trần Hưng Đạo',
            city: 'Hà Nội',
            groupId: vvipGroup?.id || defaultGroup.id,
            totalOrders: 45,
            totalSpent: 25000000
        },
        {
            code: 'KH004',
            name: 'Phạm Thị Dung',
            gender: Gender.FEMALE,
            phone: '0904567890',
            address: '321 Hai Bà Trưng',
            city: 'Đà Nẵng',
            groupId: defaultGroup.id,
            totalOrders: 3,
            totalSpent: 800000
        },
        {
            code: 'KH005',
            name: 'Hoàng Văn Em',
            gender: Gender.MALE,
            phone: '0905678901',
            address: '654 Lý Thường Kiệt',
            city: 'TP. Hồ Chí Minh',
            groupId: vipGroup?.id || defaultGroup.id,
            totalOrders: 20,
            totalSpent: 9000000
        }
    ]

    const result = []
    for (const customer of customers) {
        const created = await prisma.customer.upsert({
            where: { code: customer.code },
            update: {},
            create: customer
        })
        result.push(created)
    }

    return result
}
