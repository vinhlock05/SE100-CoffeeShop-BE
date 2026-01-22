
import { PrismaClient } from '@prisma/client'
import { orderService } from '../services/order.service'
import { purchaseOrderService } from '../services/purchaseOrder.service'
import { payrollService } from '../services/payroll.service'
import { financeService } from '../services/finance.service'

const prisma = new PrismaClient()

export async function seedDemoData() {
  // Check if we should run
  const orderCount = await prisma.order.count()
  if (orderCount > 0) {
      console.log('⚠️ Orders already exist. Skipping demo data seed.')
      return
  }

  console.log('🌱 Starting Demo Data Seed...')

  // 1. Setup Master Data
  // Get admin staff for 'createdBy' context
  const adminStaff = await prisma.staff.findFirst({
    where: { user: { username: 'admin' } }
  })
  
  if (!adminStaff) {
      console.log('⚠️ Admin staff not found. Skipping demo data.')
      return
  }
  const staffId = adminStaff.id

  // Get a customer
  let customer = await prisma.customer.findFirst()
  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        code: 'KH999999',
        name: 'Khách hàng Demo',
        phone: '0999999999',
        groupId: (await prisma.customerGroup.findFirst())?.id || 1
      }
    })
  }

  // Get a table
  const table = await prisma.table.findFirst({ where: { currentStatus: 'available' } })
  
  // Get some products
  const products = await prisma.inventoryItem.findMany({ 
    where: { itemTypeId: 1, sellingPrice: { gt: 0 } }, // Ready made
    take: 3 
  })
  if (products.length < 2) {
      console.log('⚠️ Not enough items to seed orders.')
      return
  }

  // Get a supplier
  let supplier = await prisma.supplier.findFirst()
  if (!supplier) {
    supplier = await prisma.supplier.create({
      data: {
        code: 'NCC_DEMO',
        name: 'Nhà Cung Cấp Demo',
        phone: '0888888888'
      }
    })
  }

  // Get/Create Bank Account
  let bankAccount = await prisma.bankAccount.findFirst()
  if (!bankAccount) {
    bankAccount = await prisma.bankAccount.create({
      data: {
        accountName: 'Demo Bank',
        accountNumber: '123456789',
        bankName: 'MB Bank',
        ownerName: 'Admin'
      }
    })
  }

  // Create a Promotion
  let promotion = await prisma.promotion.findFirst({ where: { code: 'KM_DEMO_10' } })
  if (!promotion) {
      // Create type if missing
      const discountType = await prisma.promotionType.findFirst() || await prisma.promotionType.create({ data: { name: 'discount_bill' } })
      
      promotion = await prisma.promotion.create({
          data: {
              code: 'KM_DEMO_10',
              name: 'Khuyễn mãi Demo 10%',
              typeId: discountType.id,
              discountValue: 10,
              isActive: true,
              applyToAllItems: true,
              applyToAllCustomers: true
          }
      })
  }


  // ===========================================
  // Scenario 1: Completed Order (Thu)
  // ===========================================
  console.log('🛒 Scenario 1: Creating Completed Order...')
  if (table) {
      // Create Order
      let order = await orderService.create({
          tableId: table.id,
          customerCount: 2
      } as any, staffId)

      // Add Items
      order = await orderService.addItem(order.id, {
          itemId: products[0].id,
          quantity: 2
      })
      order = await orderService.addItem(order.id, {
          itemId: products[1].id,
          quantity: 1
      })
      
      // Checkout
      const checkoutDto = {
          paymentMethod: 'cash',
          paidAmount: Number(order.totalAmount), // Exact amount
          promotionId: promotion.id // Apply promotion at checkout
      }

      await orderService.checkout(order.id, checkoutDto as any)
      console.log(`✅ Order ${order.orderCode} completed.`)
  } else {
      console.log('⚠️ No available table for Scenario 1')
  }


  // ===========================================
  // Scenario 2: Order with Cancellation
  // ===========================================
  console.log('🛒 Scenario 2: Creating Order with Cancellation...')
  const table2 = await prisma.table.findFirst({ where: { currentStatus: 'available' } })
  if (table2) {
      let order2 = await orderService.create({
          tableId: table2.id
      }, staffId)

      // Add Items
      order2 = await orderService.addItem(order2.id, {
          itemId: products[0].id,
          quantity: 5
      })
      // Send to kitchen (so we can Cancel instead of Delete)
      await orderService.sendToKitchen(order2.id)

      // Cancel 2 items
      const itemToCancel = order2.orderItems[0]
      await orderService.reduceItem(order2.id, itemToCancel.id, {
          quantity: 2,
          reason: 'Khách đổi ý'
      })

      // Checkout remaining
      order2 = await orderService.getById(order2.id) // refresh totals
      await orderService.checkout(order2.id, {
          paymentMethod: 'transfer',
          paidAmount: Number(order2.totalAmount),
          bankAccountId: bankAccount.id
      } as any)
      console.log(`✅ Order ${order2.orderCode} completed with cancellation.`)
  } else {
      console.log('⚠️ No available table for Scenario 2')
  }


  // ===========================================
  // Scenario 3: Purchase Order (Chi)
  // ===========================================
  console.log('📦 Scenario 3: Creating Purchase Order...')
  // Create PO
  const po = await purchaseOrderService.create({
      supplierId: supplier.id,
      items: [
          { itemId: products[0].id, quantity: 10, unitPrice: 50000, batchCode: 'BATCH01' },
          { itemId: products[1].id, quantity: 20, unitPrice: 30000, batchCode: 'BATCH02' }
      ],
      paymentMethod: 'cash' as any,
      paidAmount: 500000, // Partial payment
      notes: 'Nhập hàng Demo'
  }, staffId)

  // Add more payment
  await purchaseOrderService.addPayment(po.id, {
      amount: 100000,
      paymentMethod: 'bank' as any,
      bankAccountId: bankAccount.id,
      notes: 'Thanh toán thêm đợt 2'
  }, staffId)
  
  console.log(`✅ Purchase Order ${po.code} created and paid partially.`)


  // ===========================================
  // Scenario 4: Payroll (Chi)
  // ===========================================
  console.log('💰 Scenario 4: Creating Payroll...')
  // Create Payroll for current month
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  
  // Cleanup existing draft if any to avoid error
  const existingPayroll = await prisma.payroll.findFirst({
      where: { 
        periodStart: new Date(year, month - 1, 1),
        periodEnd: new Date(year, month, 0)
      }
  })
  if (existingPayroll) {
    if(existingPayroll.status === 'draft'){
         // Try adding payment to a Payslip
         const payslip = await prisma.payslip.findFirst({ where: { payrollId: existingPayroll.id } })
         if(payslip){
            await payrollService.addPayment(existingPayroll.id, {
                staffId: payslip.staffId,
                amount: 1000000,
                method: 'cash' as any,
                note: 'Ứng lương Demo'
            }, staffId)
            console.log(`✅ Added payment to existing payroll ${existingPayroll.code}`)
         }
    }
  } else {
    try {
        const payroll = await payrollService.createPayroll({ month, year }, staffId)
        
         // Add Payment
         // payroll return might be generic, use as any to access payslips if TS complains
         const pAny = payroll as any
         if(pAny && pAny.payslips && pAny.payslips.length > 0) { 
             const targetPayslip = pAny.payslips[0]
              await payrollService.addPayment(pAny.id, {
                staffId: targetPayslip.staffId,
                amount: 500000,
                method: 'transfer' as any,
                bankAccount: bankAccount.accountNumber,
                bankName: bankAccount.bankName,
                note: 'Thanh toán lương Demo'
            }, staffId)
            console.log(`✅ Payroll ${pAny.code} created and paid.`)
         } else {
             // Fallback fetch
             const fullPayroll = await payrollService.getPayrolls({ month, year }).then(res => res[0])
             if (fullPayroll && fullPayroll.payslips.length > 0) {
                 const targetPayslip = fullPayroll.payslips[0]
                 await payrollService.addPayment(fullPayroll.id, {
                    staffId: targetPayslip.staffId,
                    amount: 500000,
                    method: 'transfer' as any,
                    bankAccount: bankAccount.accountNumber,
                    bankName: bankAccount.bankName,
                    note: 'Thanh toán lương Demo'
                }, staffId)
                console.log(`✅ Payroll ${fullPayroll.code} created and paid.`)
             }
         }
    } catch (e: any) {
        console.log("Error creating payroll (might be due to empty timesheets):", e.message)
    }
  }


  // ===========================================
  // Scenario 5: Manual Income (Thu)
  // ===========================================
  console.log('💵 Scenario 5: Creating Manual Income Transaction...')
  const otherIncomeCategory = await prisma.financeCategory.findFirst({ where: { typeId: 1, name: 'Thu khác' } }) 
      || await prisma.financeCategory.create({ data: { name: 'Thu khác', typeId: 1 } })

  await financeService.createTransaction({
      categoryId: otherIncomeCategory.id,
      amount: 1500000,
      paymentMethod: 'cash' as any,
      personName: 'Nhà tài trợ Demo',
      notes: 'Khoản thu demo từ script'
  }, staffId)
  console.log(`✅ Manual Income Transaction created.`)
}
