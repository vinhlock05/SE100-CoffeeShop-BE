/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const seedWriteOffs = async () => {
    console.log('🔥 Seeding Write-Offs...')

    // 1. Get Ingredients
    const typeIngredient = await prisma.itemType.findUnique({ where: { name: 'ingredient' } });
    if (!typeIngredient) return;

    const ingredients = await prisma.inventoryItem.findMany({
        where: { itemTypeId: typeIngredient.id }
    });

    if (ingredients.length === 0) {
        console.log('No ingredients found to write off.');
        return;
    }

    // 2. Ensure Batches Exist (Required for WriteOff Items)
    // We will create some dummy batches for these ingredients
    const adminStaff = await prisma.staff.findFirst();
    if (!adminStaff) return;

    const batches = [];
    console.log('   📦 generating batches for ingredients...');
    
    for (const item of ingredients) {
        // Check if batch exists
        let batch = await prisma.inventoryBatch.findFirst({ where: { itemId: item.id } });
        
        if (!batch) {
            batch = await prisma.inventoryBatch.create({
                data: {
                    itemId: item.id,
                    batchCode: `BATCH-${item.code}-001`,
                    quantity: 100, // Initial large qty
                    remainingQty: 50,
                    unit: 'kg', // Simplified, assumption
                    entryDate: new Date(),
                    unitCost: item.avgUnitCost || 0
                }
            })
        }
        batches.push(batch);
    }

    // 3. Create Write-Offs
    // Create 3 WriteOff events
    const reasons = ['Hết hạn sử dụng', 'Hư hỏng do bảo quản', 'Đổ vỡ'];
    
    for (let i = 0; i < 3; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (i * 5));

        const writeOffCode = `XH${String(i + 1).padStart(6, '0')}`;
        
        // Check existing
        const existingWO = await prisma.writeOff.findUnique({ where: { code: writeOffCode } });
        if (existingWO) continue;
        
        // Select random items to write off
        const selectedBatches = batches.sort(() => 0.5 - Math.random()).slice(0, 2); // Pick 2 items
        
        let totalValue = 0;
        const writeOffItemsData = [];

        for (const batch of selectedBatches) {
            const qty = 1 + Math.floor(Math.random() * 5); // 1-5 units
            const cost = Number(batch.unitCost || 0);
            const value = qty * cost;
            totalValue += value;

            writeOffItemsData.push({
                itemId: batch.itemId,
                batchId: batch.id,
                quantity: qty,
                unit: batch.unit,
                unitCost: cost,
                totalValue: value,
                reason: reasons[i % reasons.length],
                notes: 'Hủy định kỳ'
            });
        }

        await prisma.writeOff.create({
            data: {
                code: writeOffCode,
                writeOffDate: date,
                reason: reasons[i % reasons.length],
                staffId: adminStaff.id,
                status: 'completed',
                totalValue,
                notes: `Phiếu hủy mẫu ${i+1}`,
                writeOffItems: {
                    create: writeOffItemsData
                }
            }
        });
        
        // Note: In a real system, we should also deduct `InventoryBatch.remainingQty` and `InventoryItem.currentStock`.
        // Since this is just seeding, we might skip logic logic or do it manually.
        // Let's do a quick update for consistency
        for (const item of writeOffItemsData) {
             await prisma.inventoryBatch.update({
                 where: { id: item.batchId },
                 data: { remainingQty: { decrement: item.quantity } }
             });
             // Item stock update (if item tracks total stock)
             await prisma.inventoryItem.update({
                 where: { id: item.itemId },
                 data: { currentStock: { decrement: item.quantity } }
             })
        }
    }

    console.log('✅ Write-Offs Seed Completed.')
}
