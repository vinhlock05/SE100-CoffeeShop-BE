import { prisma } from '../config/database'

export async function seedCombos() {
    console.log('🌱 Seeding combos...')

    // Combo 1: Breakfast Combo
    const breakfastCombo = await prisma.combo.create({
        data: {
            name: 'Combo Sáng Healthy',
            description: 'Bánh mì + Cà phê sữa + Trứng ốp la',
            comboPrice: 45000,
            originalPrice: 55000,
            savings: 10000,
            isActive: true,
            startDate: new Date('2026-01-01'),
            endDate: new Date('2026-12-31'),
            comboItems: {
                createMany: {
                    data: [
                        { itemId: 15, quantity: 1, groupName: 'Món chính', isRequired: true },  // Bánh mì
                        { itemId: 1, quantity: 1, groupName: 'Đồ uống', isRequired: true },     // Cà phê
                        { itemId: 20, quantity: 1, groupName: 'Thêm', isRequired: false }       // Trứng
                    ]
                }
            }
        }
    })

    // Combo 2: Afternoon Tea
    const afternoonCombo = await prisma.combo.create({
        data: {
            name: 'Combo Trà Chiều',
            description: 'Trà sữa + 2 Bánh ngọt',
            comboPrice: 65000,
            originalPrice: 80000,
            savings: 15000,
            isActive: true,
            startDate: new Date('2026-01-01'),
            endDate: new Date('2026-12-31'),
            comboItems: {
                createMany: {
                    data: [
                        { itemId: 5, quantity: 1, groupName: 'Đồ uống', isRequired: true },   // Trà sữa
                        { itemId: 10, quantity: 2, groupName: 'Bánh', isRequired: true }      // Bánh ngọt
                    ]
                }
            }
        }
    })

    // Combo 3: Student Combo
    const studentCombo = await prisma.combo.create({
        data: {
            name: 'Combo Sinh Viên',
            description: 'Nước ngọt + Snack',
            comboPrice: 25000,
            originalPrice: 30000,
            savings: 5000,
            isActive: true,
            startDate: new Date('2026-01-01'),
            endDate: new Date('2026-12-31'),
            comboItems: {
                createMany: {
                    data: [
                        { itemId: 1, quantity: 1, groupName: 'Đồ uống', isRequired: true },   // Coca
                        { itemId: 12, quantity: 1, groupName: 'Snack', isRequired: true }     // Snack
                    ]
                }
            }
        }
    })

    console.log(`✅ Seeded ${3} combos`)
    return { breakfastCombo, afternoonCombo, studentCombo }
}
