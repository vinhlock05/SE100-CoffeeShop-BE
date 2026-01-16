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
            comboGroups: {
                create: [
                    {
                        name: 'Món chính',
                        minChoices: 1,
                        maxChoices: 1,
                        isRequired: true,
                        comboItems: {
                            create: [
                                { itemId: 15, extraPrice: 0 } // Bánh mì
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
                                { itemId: 1, extraPrice: 0 } // Cà phê sữa
                            ]
                        }
                    },
                    {
                        name: 'Món thêm',
                        minChoices: 0,
                        maxChoices: 1,
                        isRequired: false,
                        comboItems: {
                            create: [
                                { itemId: 20, extraPrice: 5000 } // Trứng ốp la
                            ]
                        }
                    }
                ]
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
            comboGroups: {
                create: [
                    {
                        name: 'Đồ uống',
                        minChoices: 1,
                        maxChoices: 1,
                        isRequired: true,
                        comboItems: {
                            create: [
                                { itemId: 5, extraPrice: 0 } // Trà sữa
                            ]
                        }
                    },
                    {
                        name: 'Bánh ngọt',
                        minChoices: 2,
                        maxChoices: 2,
                        isRequired: true,
                        comboItems: {
                            create: [
                                { itemId: 10, extraPrice: 0 } // Bánh ngọt
                            ]
                        }
                    }
                ]
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
            comboGroups: {
                create: [
                    {
                        name: 'Nước giải khát',
                        minChoices: 1,
                        maxChoices: 1,
                        isRequired: true,
                        comboItems: {
                            create: [
                                { itemId: 2, extraPrice: 0 }, // Coca
                                { itemId: 3, extraPrice: 0 }  // Pepsi
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
                                { itemId: 12, extraPrice: 0 } // Snack
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
