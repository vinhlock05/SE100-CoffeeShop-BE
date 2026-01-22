/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client'

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

const prisma = new PrismaClient()

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
        }
    }
    return results
}

export const seedFinancePersons = async () => {
    console.log('🌱 Seeding Finance Persons...')
    const persons = [
        { name: 'Chi Cuc Thue', phone: '0243123456', address: 'Ha Noi' },
        { name: 'Cong ty Dien Luc', phone: '19001000', address: 'Ha Noi' }
    ]
    const results = []
    for (const p of persons) {
        const existing = await prisma.financePerson.findFirst({ where: { name: p.name } })
        if (!existing) {
            results.push(await prisma.financePerson.create({ data: p }))
        }
    }
    return results
}

export const seedFinance = async () => {
    console.log('🌱 Seeding Finance Data (Orders, POs, Payroll)...')

    // 1. Prepare dependencies
    const items = await prisma.inventoryItem.findMany()
    if (items.length === 0) return console.log('No inventory items found. Skipping.')

    const tables = await prisma.table.findMany({ include: { area: true } })
    const customers = await prisma.customer.findMany()
    const suppliers = await prisma.supplier.findMany()
    
    // Staff
    const staffList = await prisma.staff.findMany({ include: { user: true } })
    const adminStaff = staffList.find(s => s.user?.username === 'admin') || staffList[0]
    
    if (!adminStaff) {
        console.log('No staff found. Skipping.')
        return
    }

    // Finance Categories - seeded in types.seed.ts
    const incomeCategory = await prisma.financeCategory.findFirst({ where: { name: 'Tiền khách trả', typeId: 1 } })
    const expenseCategory = await prisma.financeCategory.findFirst({ where: { name: 'Tiền trả NCC', typeId: 2 } })
    const payrollCategory = await prisma.financeCategory.findFirst({ where: { name: 'Tiền lương', typeId: 2 } })

    if (!incomeCategory || !expenseCategory || !payrollCategory) {
        console.log('❌ Missing Finance Categories. Ensure seedFinanceCategories has run.')
        return
    }

    // ==========================================
    // 2. SEED PURCHASE ORDERS & SUPPLIER PAYMENTS
    // ==========================================
    console.log('   📦 Seeding Purchase Orders...')
    const poDates = Array.from({ length: 5 }).map((_, i) => {
        const d = new Date()
        d.setDate(d.getDate() - (i * 3) - 1) 
        return d
    })

    for (let i = 0; i < poDates.length; i++) {
        const poDate = poDates[i];
        if (suppliers.length === 0) break

        const supplier = suppliers[Math.floor(Math.random() * suppliers.length)]
        const item = items[Math.floor(Math.random() * items.length)]
        
        const quantity = 10 + Math.floor(Math.random() * 20)
        const unitCost = Number(item.avgUnitCost || item.sellingPrice || 30000) * 0.7 
        const totalAmount = quantity * unitCost

        // Transaction Code (Standard Format: PCPN000001)
        // Use simple sequence i + 1 as user requested
        const codeSuffix = String(i + 1).padStart(6, '0');
        const txCode = `PCPN${codeSuffix}`

        const existingTx = await prisma.financeTransaction.findUnique({ where: { code: txCode } })
        if (existingTx) continue;

        const tx = await prisma.financeTransaction.create({
            data: {
                code: txCode,
                categoryId: expenseCategory.id,
                amount: totalAmount,
                paymentMethod: 'cash',
                transactionDate: poDate,
                referenceType: 'purchase_order',
                status: 'completed',
                personType: 'supplier',
                personId: supplier.id,
                personName: supplier.name,
                description: `Chi mua hang tu ${supplier.name}`
            }
        })

        const poCodeSuffix = String(i + 1).padStart(6, '0');
        const poCode = `PO${poCodeSuffix}`

        // Check if PO exists
        const existingPO = await prisma.purchaseOrder.findUnique({ where: { code: poCode } })
        if (existingPO) continue;

        const po = await prisma.purchaseOrder.create({
            data: {
                code: poCode,
                supplierId: supplier.id,
                staffId: adminStaff.id,
                orderDate: poDate,
                status: 'completed',
                totalAmount,
                paidAmount: totalAmount,
                debtAmount: 0,
                paymentMethod: 'cash',
                financeTransactionId: tx.id, 
                paymentStatus: 'paid',
                purchaseOrderItems: {
                    create: [{
                        itemId: item.id,
                        quantity,
                        unitPrice: unitCost,
                        totalPrice: totalAmount
                    }]
                }
            }
        })

        await prisma.financeTransaction.update({
            where: { id: tx.id },
            data: { referenceId: po.id }
        })
    }

    // ==========================================
    // 3. SEED PAYROLL (Salary Payment)
    // ==========================================
    console.log('   💰 Seeding Payroll & Salary Payments...')
    // Create a Payroll Period for last month
    const today = new Date();
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
    
    const payrollCode = `BL${String(1).padStart(6, '0')}`;
    
    // Check if payroll exists
    let payroll = await prisma.payroll.findUnique({ where: { code: payrollCode } });
    if (!payroll) {
        payroll = await prisma.payroll.create({
            data: {
                code: payrollCode,
                name: `Bảng lương tháng ${lastMonthStart.getMonth() + 1}/${lastMonthStart.getFullYear()}`,
                periodStart: lastMonthStart,
                periodEnd: lastMonthEnd,
                status: 'finalized',
                totalAmount: 0, // Will update
                createdBy: adminStaff.id,
                finalizedAt: today
            }
        })
    }

    let totalPayrollAmount = 0;

    // Generate Payslips & Payments for each staff
    for (let i = 0; i < staffList.length; i++) {
        const staff = staffList[i];
        
        // Skip if payslip exists
        const existingPayslip = await prisma.payslip.findFirst({
            where: { payrollId: payroll.id, staffId: staff.id }
        });
        
        if (existingPayslip) continue;

        const baseSalary = 5000000 + Math.floor(Math.random() * 5000000); // 5-10tr
        const workDays = 26;
        const totalSalary = baseSalary;

        const payslipCode = `PL${String(i + 1).padStart(6, '0')}`;
        
        // Skip if payslip code exists
        const existingPayslipCode = await prisma.payslip.findUnique({ where: { code: payslipCode } });
        if (existingPayslipCode) continue;

        const payslip = await prisma.payslip.create({
            data: {
                code: payslipCode,
                payrollId: payroll.id,
                staffId: staff.id,
                baseSalary,
                totalSalary,
                workDays,
                paidAmount: totalSalary,
                notes: 'Lương chính thức'
            }
        });

        totalPayrollAmount += totalSalary;

        // Create Payment & Finance Transaction
        const txCode = `PCPL${String(i + 1).padStart(6, '0')}`;
        
        const existingTx = await prisma.financeTransaction.findUnique({ where: { code: txCode } })
        if (existingTx) continue;
        
        const tx = await prisma.financeTransaction.create({
            data: {
                code: txCode,
                categoryId: payrollCategory.id,
                amount: totalSalary,
                paymentMethod: 'transfer',
                transactionDate: today, // Paid today
                referenceType: 'payroll',
                referenceId: payslip.id, 
                status: 'completed',
                personType: 'staff',
                personId: staff.id,
                personName: staff.fullName,
                description: `Thanh toan luong T${lastMonthStart.getMonth() + 1} cho ${staff.fullName}`
            }
        });

        await prisma.payrollPayment.create({
            data: {
                payslipId: payslip.id,
                amount: totalSalary,
                method: 'transfer',
                financeTransactionId: tx.id,
                createdBy: adminStaff.id
            }
        });
    }

    // Update Payroll Total
    if (totalPayrollAmount > 0) {
        await prisma.payroll.update({
             where: { id: payroll.id },
             data: { totalAmount: totalPayrollAmount }
        });
    }


    // ==========================================
    // 4. SEED SALES ORDERS (Completed & Cancelled)
    // ==========================================
    console.log('   🛒 Seeding Sales Orders (Completed & Returns)...')
    const orderParams = []
    const days = 14
    for (let i = 0; i < days; i++) {
        const ordersInDay = 3 + Math.floor(Math.random() * 2) 
        const day = new Date()
        day.setDate(day.getDate() - i)

        for (let j = 0; j < ordersInDay; j++) {
            const orderDate = new Date(day)
            orderDate.setHours(8 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 60))
            orderParams.push({ orderDate, index: j })
        }
    }

    const selectedOrders = orderParams.slice(0, 40)

    for (let i = 0; i < selectedOrders.length; i++) {
        const { orderDate } = selectedOrders[i]
        const orderSequence = i + 1; // Simple sequence from 1
        // Removed original index usage for simplicity
        
        // Determine scenarios:
        // 1. Normal Completed (80%)
        // 2. Cancelled Order (10%)
        // 3. Completed but has Cancelled Items (Return) (10%)
        
        const rand = Math.random();
        let orderStatus = OrderStatus.completed;
        const hasReturnItems = rand > 0.8 && rand <= 0.9;
        const isCancelledOrder = rand > 0.9;

        if (isCancelledOrder) orderStatus = OrderStatus.cancelled;

        const itemCount = 1 + Math.floor(Math.random() * 4)
        const orderItemsData = []
        let totalAmount = 0
        let subtotal = 0;

        for (let k = 0; k < itemCount; k++) {
            const item = items[Math.floor(Math.random() * items.length)]
            const quantity = 1 + Math.floor(Math.random() * 2)
            const price = Number(item.sellingPrice || 45000)
            const itemTotal = price * quantity
            
            let itemStatus = 'completed';
            if (isCancelledOrder) {
                itemStatus = 'cancelled';
            } else if (hasReturnItems && k === 0) {
                // First item is cancelled/returned
                itemStatus = 'cancelled';
                // If item is deferred/cancelled, it might not contribute to final total paid, 
                // but usually subtotal includes it then discount or adjustment logic applies.
                // For simplicity: cancelled items don't add to PAID total.
            }

            if (itemStatus === 'completed') {
                totalAmount += itemTotal
            }
            subtotal += itemTotal;

            orderItemsData.push({
                itemId: item.id,
                name: item.name,
                quantity,
                unitPrice: price,
                totalPrice: itemTotal,
                status: itemStatus
            })
        }

        // Customer
        const customer = Math.random() > 0.4 && customers.length > 0 ? customers[Math.floor(Math.random() * customers.length)] : null
        
        // Table
        let tableId = null
        if (tables.length > 0 && Math.random() > 0.3) {
            tableId = tables[Math.floor(Math.random() * tables.length)].id
        }

        // Create Order
        const orderSuffix = String(orderSequence).padStart(6, '0');
        const orderCode = `HD${orderSuffix}`;
        
        // Check existing
        const existingOrder = await prisma.order.findUnique({ where: { orderCode } })
        if (existingOrder) continue;
        
        const order = await prisma.order.create({
            data: {
                orderCode: orderCode,
                status: orderStatus,
                paymentStatus: isCancelledOrder ? 'unpaid' : PaymentStatus.paid,
                totalAmount: isCancelledOrder ? 0 : totalAmount, // If cancelled, usually 0 owed
                subtotal,
                discountAmount: 0,
                paidAmount: isCancelledOrder ? 0 : totalAmount,
                createdAt: orderDate,
                completedAt: orderStatus === OrderStatus.completed ? orderDate : null,
                staffId: adminStaff.id,
                tableId,
                customerId: customer?.id,
                paymentMethod: 'cash',
                orderItems: {
                    create: orderItemsData
                }
            }
        })

        // Create Finance Transaction IF there is payment
        if (orderStatus === OrderStatus.completed && totalAmount > 0) {
            const codeSuffix = String(orderSequence).padStart(6, '0');
            const txCode = `TTHD${codeSuffix}`;

            const existingTx = await prisma.financeTransaction.findUnique({ where: { code: txCode } })
            if (existingTx) continue;
            
            await prisma.financeTransaction.create({
                data: {
                    code: txCode,
                    categoryId: incomeCategory.id,
                    amount: totalAmount,
                    paymentMethod: 'cash',
                    transactionDate: orderDate,
                    referenceType: 'order',
                    referenceId: order.id,
                    status: 'completed',
                    personType: customer ? 'customer' : 'other',
                    personId: customer?.id,
                    personName: customer?.name || 'Khách lẻ',
                    description: `Thu tien don hang ${order.orderCode}`
                }
            })
        }
    }

    console.log('✅ Finance Seed Completed.')
}
