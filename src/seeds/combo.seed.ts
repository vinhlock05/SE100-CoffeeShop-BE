import { prisma } from '../config/database'

export async function seedCombos() {
    console.log('🌱 Seeding combos...')

    // Skip if already seeded
    const existingCount = await prisma.combo.count()
    if (existingCount > 0) {
        console.log(`⏭️ Skipped combos (${existingCount} already exist)`)
        return { skipped: true }
    }

    // Combo 1: Breakfast Combo - Bánh mì + Cà phê sữa + Trứng (optional)
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
            comboGroups: {
                create: [
                    {
                        name: 'Món chính',
                        minChoices: 1,
                        maxChoices: 1,
                        isRequired: true,
                        comboItems: {
                            create: [
                                { itemId: 15, extraPrice: 0 }, // Bánh mì
                                { itemId: 16, extraPrice: 5000 } // Bánh croissant
                            ]
                        }
                    },
                    {
                        name: 'Đồ uống',
                        minChoices: 1,
                        maxChoices: 1,
                        isRequired: true,
                        comboItems: {
                            create: [
                                { itemId: 1, extraPrice: 0 }, // Cà phê sữa
                                { itemId: 2, extraPrice: 0 }, // Cà phê đen
                                { itemId: 8, extraPrice: 5000 } // Trà sữa
                            ]
                        }
                    },
                    {
                        name: 'Món thêm',
                        minChoices: 0,
                        maxChoices: 2,
                        isRequired: false,
                        comboItems: {
                            create: [
                                { itemId: 20, extraPrice: 5000 }, // Ống hút giấy
                                { itemId: 21, extraPrice: 3000 }  // Khăn giấy
                            ]
                        }
                    }
                ]
            }
        }
    })

    // Combo 2: Afternoon Tea - Trà sữa + Bánh ngọt
    const afternoonCombo = await prisma.combo.create({
        data: {
            name: 'Combo Trà Chiều',
            description: 'Trà sữa + Bánh ngọt',
            comboPrice: 65000,
            originalPrice: 80000,
            savings: 15000,
            isActive: true,
            startDate: new Date('2026-01-01'),
            endDate: new Date('2026-12-31'),
            comboGroups: {
                create: [
                    {
                        name: 'Đồ uống',
                        minChoices: 1,
                        maxChoices: 1,
                        isRequired: true,
                        comboItems: {
                            create: [
                                { itemId: 8, extraPrice: 0 },  // Trà sữa
                                { itemId: 9, extraPrice: 0 },  // Trà lài
                                { itemId: 10, extraPrice: 5000 } // Matcha latte
                            ]
                        }
                    },
                    {
                        name: 'Bánh ngọt',
                        minChoices: 1,
                        maxChoices: 2,
                        isRequired: true,
                        comboItems: {
                            create: [
                                { itemId: 11, extraPrice: 0 }, // Bánh tiramisu
                                { itemId: 12, extraPrice: 0 }, // Bánh cheesecake
                                { itemId: 13, extraPrice: 10000 } // Bánh mousse
                            ]
                        }
                    }
                ]
            }
        }
    })

    // Combo 3: Student Combo - Nước ngọt + Snack
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
            comboGroups: {
                create: [
                    {
                        name: 'Nước giải khát',
                        minChoices: 1,
                        maxChoices: 1,
                        isRequired: true,
                        comboItems: {
                            create: [
                                { itemId: 3, extraPrice: 0 }, // Coca Cola
                                { itemId: 4, extraPrice: 0 }, // Pepsi
                                { itemId: 5, extraPrice: 0 }  // Sprite
                            ]
                        }
                    },
                    {
                        name: 'Ăn vặt',
                        minChoices: 1,
                        maxChoices: 1,
                        isRequired: true,
                        comboItems: {
                            create: [
                                { itemId: 14, extraPrice: 0 }, // Khoai tây chiên
                                { itemId: 17, extraPrice: 5000 } // Gà rán
                            ]
                        }
                    }
                ]
            }
        }
    })

    console.log(`✅ Seeded ${3} combos`)
    return { breakfastCombo, afternoonCombo, studentCombo }
}
