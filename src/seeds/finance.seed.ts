/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client'
import { OrderItemStatus } from '~/enums/order.enum'

const prisma = new PrismaClient()

// Order Status Helpers
const OrderStatus = {
    completed: 'completed',
    pending: 'pending',
    cancelled: 'cancelled'
}
const PaymentStatus = {
    paid: 'paid',
    unpaid: 'unpaid',
    partial: 'partial'
}

/**
 * Seed Bank Accounts (Used by seed.ts)
 */
export const seedBankAccounts = async () => {
    console.log('🌱 Seeding Bank Accounts...')
    const banks = [
        { accountName: 'Tài Khoản Chính (MB)', accountNumber: '000123456789', bankName: 'MB', ownerName: 'SE100 COFFEE SHOP' },
        { accountName: 'Tài Khoản Phụ (TPB)', accountNumber: '000987654321', bankName: 'TPB', ownerName: 'SE100 COFFEE SHOP' },
        { accountName: 'NCC Nguyên Liệu Sạch (TCB)', accountNumber: '1903456789012', bankName: 'TCB', ownerName: 'CTY TNHH NGUYEN LIEU SACH' },
        { accountName: 'Ton Vinh Loc (BIDV)', accountNumber: '5730587907', bankName: 'BIDV', ownerName: 'Tôn Vĩnh Lộc' }
    ]
    const results = []
    for (const bank of banks) {
        const existing = await prisma.bankAccount.findFirst({ where: { accountNumber: bank.accountNumber } })
        if (!existing) {
            results.push(await prisma.bankAccount.create({ data: bank }))
        } else {
            results.push(existing)
        }
    }
    return results
}

/**
 * Seed Finance Persons (Used by seed.ts)
 */
export const seedFinancePersons = async () => {
    console.log('🌱 Seeding Finance Persons...')
    const persons = [
        { name: 'Chi Cuc Thue', phone: '0243123456', address: 'Ha Noi' },
        { name: 'Cong ty Dien Luc', phone: '19001000', address: 'Ha Noi' },
        { name: 'Nha Cung Cap Ca Phe', phone: '0909000111', address: 'Dak Lak' }
    ]
    const results = []
    for (const p of persons) {
        const existing = await prisma.financePerson.findFirst({ where: { name: p.name } })
        if (!existing) {
            results.push(await prisma.financePerson.create({ data: p }))
        } else {
            results.push(existing)
        }
    }
    return results
}

/**
 * Main Finance Seeder (Using direct Prisma to bypass service validations)
 */
export async function seedFinance() {
    console.log('🌱 Checking Finance Data Idempotency...')

    // 0. IDEMPOTENCY CHECK
    // Skip if we already have significant order data (e.g. > 20)
    const orderCount = await prisma.order.count()
    if (orderCount > 20) {
        console.log('⚠️ Data already exists. Skipping finance seed to prevent duplication.')
        return
    }

    // 1. PREPARE DEPENDENCIES
    const items = await prisma.inventoryItem.findMany()
    if (items.length === 0) {
        console.log('⚠️ No inventory items found. Please run inventory seed first.')
        return
    }

    const tables = await prisma.table.findMany()
    const customers = await prisma.customer.findMany()
    const suppliers = await prisma.supplier.findMany()
    const staffList = await prisma.staff.findMany({ include: { user: true } })
    const adminStaff = staffList.find(s => s.user?.username === 'admin') || staffList[0]

    // Finance Categories
    const categories = {
        income: await getOrCreateCategory('Tiền khách trả', 1),
        otherIncome: await getOrCreateCategory('Thu nhập khác', 1),
        expense: await getOrCreateCategory('Tiền trả NCC', 2),
        payroll: await getOrCreateCategory('Tiền lương', 2),
        otherExpense: await getOrCreateCategory('Chi phí khác', 2),
    }

    const bankAccount = await prisma.bankAccount.findFirst()

    // ==========================================
    // 2. GENERATE 30 DAYS OF DATA
    // ==========================================
    const today = new Date()
    const daysToSeed = 30
    let totalOrders = 0

    console.log(`📊 Generating ~150 historical records over the last 30 days...`)

    for (let i = daysToSeed; i >= 0; i--) {
        const currentDate = new Date()
        currentDate.setDate(today.getDate() - i)
        const dateStr = currentDate.toISOString().split('T')[0]

        // --- A. PURCHASE ORDERS (~1 per day = 30 total) ---
        if (suppliers.length > 0) {
            const supplier = suppliers[Math.floor(Math.random() * suppliers.length)]
            const poDate = new Date(currentDate)
            poDate.setHours(8, 0, 0)

            const poItemsData = []
            let poTotal = 0
            const numItems = 2 + Math.floor(Math.random() * 3)
            
            for (let k = 0; k < numItems; k++) {
                const item = items[Math.floor(Math.random() * items.length)]
                const qty = 10 + Math.floor(Math.random() * 50)
                const cost = Number(item.avgUnitCost || item.sellingPrice || 30000) * 0.6
                const lineTotal = qty * cost
                poTotal += lineTotal
                poItemsData.push({ itemId: item.id, quantity: qty, unitPrice: cost, totalPrice: lineTotal, batchCode: `B${i}${k}` })
            }

            const po = await prisma.purchaseOrder.create({
                data: {
                    code: `PO${dateStr.replace(/-/g, '')}${i}`,
                    supplierId: supplier.id,
                    staffId: adminStaff.id,
                    orderDate: poDate,
                    status: 'completed',
                    totalAmount: poTotal,
                    paidAmount: poTotal,
                    debtAmount: 0,
                    paymentMethod: 'transfer',
                    createdAt: poDate,
                    purchaseOrderItems: { create: poItemsData }
                }
            })

            // PO Transaction
            await prisma.financeTransaction.create({
                data: {
                    code: `PCPN${po.code}`,
                    categoryId: categories.expense.id,
                    amount: poTotal,
                    paymentMethod: 'bank',
                    bankAccountId: bankAccount?.id,
                    transactionDate: poDate,
                    referenceType: 'purchase_order',
                    referenceId: po.id,
                    status: 'completed',
                    personType: 'supplier',
                    personId: supplier.id,
                    personName: supplier.name,
                    description: `Chi tiền nhập hàng ${po.code}`
                }
            })
        }

        // --- B. SALES ORDERS (~3-5 per day = ~120 total) ---
        const dailyOrderCount = 3 + Math.floor(Math.random() * 3)
        for (let j = 0; j < dailyOrderCount; j++) {
            const orderTime = new Date(currentDate)
            orderTime.setHours(9 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 60))
            
            const table = tables.length > 0 ? tables[Math.floor(Math.random() * tables.length)] : null
            const staff = staffList[Math.floor(Math.random() * staffList.length)]
            const customer = Math.random() > 0.6 && customers.length > 0 ? customers[Math.floor(Math.random() * customers.length)] : null

            // Order Items
            const itemsCount = 1 + Math.floor(Math.random() * 4)
            const orderItemsInput = []
            let subtotal = 0
            for (let k = 0; k < itemsCount; k++) {
                const item = items[Math.floor(Math.random() * items.length)]
                const qty = 1 + Math.floor(Math.random() * 2)
                const price = Number(item.sellingPrice)
                const lineTotal = qty * price
                subtotal += lineTotal
                orderItemsInput.push({
                    itemId: item.id,
                    name: item.name,
                    quantity: qty,
                    unitPrice: price,
                    totalPrice: lineTotal,
                    status: OrderItemStatus.COMPLETED
                })
            }

            const order = await prisma.order.create({
                data: {
                    orderCode: `HD${dateStr.replace(/-/g, '')}${j}`,
                    status: OrderStatus.completed,
                    paymentStatus: PaymentStatus.paid,
                    subtotal: subtotal,
                    totalAmount: subtotal,
                    paidAmount: subtotal,
                    paymentMethod: Math.random() > 0.5 ? 'cash' : 'transfer',
                    createdAt: orderTime,
                    completedAt: orderTime,
                    staffId: staff.id,
                    tableId: table?.id,
                    customerId: customer?.id,
                    orderItems: { create: orderItemsInput }
                }
            })

            // Sale Transaction
            await prisma.financeTransaction.create({
                data: {
                    code: `PTHD${order.orderCode}`,
                    categoryId: categories.income.id,
                    amount: subtotal,
                    paymentMethod: order.paymentMethod === 'cash' ? 'cash' : 'bank',
                    bankAccountId: order.paymentMethod === 'transfer' ? bankAccount?.id : undefined,
                    transactionDate: orderTime,
                    referenceType: 'order',
                    referenceId: order.id,
                    status: 'completed',
                    personType: customer ? 'customer' : 'other',
                    personId: customer?.id,
                    personName: customer?.name || 'Khách lẻ',
                    description: `Thu tiền đơn hàng ${order.orderCode}`
                }
            })

            // --- SEED CANCELLATIONS (15% chance to have one or more cancelled items) ---
            if (Math.random() > 0.85 && orderItemsInput.length > 0) {
                // Determine how many items to cancel (at least 1, up to all)
                const numToCancel = 1 + Math.floor(Math.random() * Math.min(orderItemsInput.length, 2));
                
                for (let k = 0; k < numToCancel; k++) {
                    const itemToCancel = orderItemsInput[k];
                    const cancelQty = 1;
                    // Realistic loss: 40-70% of selling price is ingredient cost
                    const lossAmount = Math.round(itemToCancel.unitPrice * (0.4 + Math.random() * 0.3));

                    // 1. Create order item with CANCELED status
                    // Note: In a real app, we might update an existing one, but for seed we create a separate record
                    // to show history of changes (like KiotViet)
                    await prisma.orderItem.create({
                        data: {
                            orderId: order.id,
                            itemId: itemToCancel.itemId,
                            name: itemToCancel.name,
                            quantity: cancelQty,
                            unitPrice: itemToCancel.unitPrice,
                            totalPrice: itemToCancel.unitPrice * cancelQty,
                            status: OrderItemStatus.CANCELED,
                            notes: 'Khách đổi ý (Seed)',
                            createdAt: orderTime,
                            updatedAt: orderTime
                        }
                    });

                    // 2. Record Loss Transaction (Chi phí khác - Lỗ hủy món)
                    await prisma.financeTransaction.create({
                        data: {
                            code: `LOSS${order.orderCode}-${k}`,
                            categoryId: categories.otherExpense.id,
                            amount: lossAmount,
                            paymentMethod: 'cash',
                            transactionDate: orderTime,
                            referenceType: 'order',
                            referenceId: order.id,
                            status: 'completed',
                            description: `Lỗ hủy món (${itemToCancel.name}) - ${order.orderCode}`
                        }
                    });
                }
            }

            totalOrders++
        }

        // --- C. MANUAL TRANSACTIONS (~1 per day) ---
        const mtDate = new Date(currentDate)
        mtDate.setHours(15, 0, 0)
        const isIncome = Math.random() > 0.5
        await prisma.financeTransaction.create({
            data: {
                code: (isIncome ? 'PTTM' : 'PCTM') + dateStr.replace(/-/g, '') + i,
                categoryId: isIncome ? categories.otherIncome.id : categories.otherExpense.id,
                amount: 100000 + Math.floor(Math.random() * 500000),
                paymentMethod: 'cash',
                transactionDate: mtDate,
                status: 'completed',
                description: isIncome ? 'Thu thanh lý đồ cũ' : 'Chi tiền điện/nước/vặt'
            }
        })
    }

    // ==========================================
    // 3. PAYROLL (1 month)
    // ==========================================
    console.log('💰 Seeding Payroll for previous month...')
    const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const payrollCode = `BL${prevMonth.getMonth() + 1}${prevMonth.getFullYear()}`
    
    const payroll = await prisma.payroll.create({
        data: {
            code: payrollCode,
            name: `Bảng lương tháng ${prevMonth.getMonth() + 1}/${prevMonth.getFullYear()}`,
            periodStart: prevMonth,
            periodEnd: new Date(today.getFullYear(), today.getMonth(), 0),
            status: 'finalized',
            totalAmount: 0,
            createdBy: adminStaff.id,
            finalizedAt: today
        }
    })

    let totalPayroll = 0
    for (const s of staffList) {
        const salary = 5000000 + Math.floor(Math.random() * 5000000)
        totalPayroll += salary
        const payslip = await prisma.payslip.create({
            data: {
                code: `PL${s.id}${payrollCode}`,
                payrollId: payroll.id,
                staffId: s.id,
                baseSalary: salary,
                totalSalary: salary,
                paidAmount: salary,
                workDays: 26
            }
        })

        await prisma.financeTransaction.create({
            data: {
                code: `PCPL${payslip.code}`,
                categoryId: categories.payroll.id,
                amount: salary,
                paymentMethod: 'bank',
                bankAccountId: bankAccount?.id,
                transactionDate: today,
                referenceType: 'payroll',
                referenceId: payslip.id,
                status: 'completed',
                personType: 'staff',
                personId: s.id,
                personName: s.fullName,
                description: `Chi lương nhân viên ${s.fullName}`
            }
        })
    }
    await prisma.payroll.update({ where: { id: payroll.id }, data: { totalAmount: totalPayroll } })

    console.log(`✅ SEED COMPLETED. Created ${totalOrders} orders, 30 POs, 30 MTs and Payroll.`)
}

/**
 * Helper to get or create finance category
 */
async function getOrCreateCategory(name: string, typeId: number) {
    let cat = await prisma.financeCategory.findFirst({ where: { name, typeId } })
    if (!cat) {
        cat = await prisma.financeCategory.create({ data: { name, typeId } })
    }
    return cat
}
