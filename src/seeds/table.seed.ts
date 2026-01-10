import { prisma } from '../config/database'

export async function seedTables() {
    // 1. Define Areas and their Tables
    const areas = [
        {
            name: 'Tầng trệt',
            tables: [
                { tableName: 'Bàn 01', capacity: 4 },
                { tableName: 'Bàn 02', capacity: 4 },
                { tableName: 'Bàn 03', capacity: 4 },
                { tableName: 'Bàn 04', capacity: 4 },
                { tableName: 'Bàn 05', capacity: 4 },
            ]
        },
        {
            name: 'Tầng 1',
            tables: [
                { tableName: 'Bàn 06', capacity: 4 },
                { tableName: 'Bàn 07', capacity: 4 },
                { tableName: 'Bàn 08', capacity: 4 },
                { tableName: 'Bàn 09', capacity: 4 },
                { tableName: 'Bàn 10', capacity: 4 },
                { tableName: 'Bàn VIP', capacity: 10 },
            ]
        },
        {
            name: 'Ban công',
            tables: [
                { tableName: 'Bàn 11', capacity: 2 },
                { tableName: 'Bàn 12', capacity: 2 },
                { tableName: 'Bàn 13', capacity: 2 },
                { tableName: 'Bàn 14', capacity: 2 },
                { tableName: 'Bàn 15', capacity: 2 },
            ]
        }
    ]

    const results = []

    for (const areaDef of areas) {
        // Find or Create Area (since name is not unique constraint)
        let area = await prisma.tableArea.findFirst({
            where: { name: areaDef.name }
        })

        if (!area) {
            area = await prisma.tableArea.create({
                data: { name: areaDef.name }
            })
        }

        // Upsert Tables for this Area
        for (const tableDef of areaDef.tables) {
            const table = await prisma.table.upsert({
                where: { tableName: tableDef.tableName },
                update: {
                    areaId: area.id,
                    capacity: tableDef.capacity
                    // Don't update status to preserve current state if running seed again
                },
                create: {
                    tableName: tableDef.tableName,
                    areaId: area.id,
                    capacity: tableDef.capacity,
                    isActive: true,
                    currentStatus: 'available'
                }
            })
            results.push(table)
        }
    }

    console.log(`✅ Seeded ${results.length} tables in ${areas.length} areas`)
    return results
}
