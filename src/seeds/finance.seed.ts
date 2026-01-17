import { prisma } from '../config/database'

// Bank Accounts
const BANK_ACCOUNTS = [
  {
    accountName: 'TK Vietcombank - Chính',
    accountNumber: '1234567890',
    bankName: 'VCB - Ngân hàng TMCP Ngoại thương Việt Nam',
    ownerName: 'Công ty TNHH CoffeeShop',
    notes: 'Tài khoản thanh toán chính'
  },
  {
    accountName: 'TK Techcombank',
    accountNumber: '0987654321',
    bankName: 'TCB - Ngân hàng TMCP Kỹ Thương Việt Nam',
    ownerName: 'Công ty TNHH CoffeeShop',
    notes: 'Tài khoản nhận thanh toán online'
  },
  {
    accountName: 'TK MBBank',
    accountNumber: '1122334455',
    bankName: 'MB - Ngân hàng TMCP Quân đội',
    ownerName: 'Nguyễn Văn A',
    notes: 'Tài khoản cá nhân chủ quán'
  },
  {
    accountName: 'TK Techcombank - NCC',
    accountNumber: '0987654321',
    bankName: 'TCB - Ngân hàng TMCP Kỹ Thương Việt Nam',
    ownerName: 'Công ty TNHH NCC',
    notes: 'Tài khoản NCC thanh toán'
  }
]

// Finance Persons (Người nộp/nhận khác)
const FINANCE_PERSONS = [
  {
    name: 'Công ty điện lực Miền Nam',
    phone: '1900545454',
    address: '72 Hai Bà Trưng, Q.1, TP.HCM',
    notes: 'Thanh toán tiền điện hàng tháng'
  },
  {
    name: 'Công ty cấp nước Sài Gòn',
    phone: '1900585858',
    address: '1 Công trường Lam Sơn, Q.1, TP.HCM',
    notes: 'Thanh toán tiền nước hàng tháng'
  },
  {
    name: 'Chủ nhà - Ông Trần Văn B',
    phone: '0901234567',
    address: '123 Nguyễn Huệ, Q.1, TP.HCM',
    notes: 'Thanh toán tiền thuê mặt bằng'
  },
  {
    name: 'Dịch vụ bảo trì máy pha',
    phone: '0912345678',
    notes: 'Bảo trì, sửa chữa máy pha cà phê'
  }
]

export async function seedBankAccounts() {
  const results = []
  for (const account of BANK_ACCOUNTS) {
    // Check if exists by account number
    const existing = await prisma.bankAccount.findFirst({
      where: { accountNumber: account.accountNumber }
    })
    
    if (existing) {
      results.push(existing)
    } else {
      const result = await prisma.bankAccount.create({
        data: account
      })
      results.push(result)
    }
  }
  return results
}

export async function seedFinancePersons() {
  const results = []
  for (const person of FINANCE_PERSONS) {
    // Check if exists by name
    const existing = await prisma.financePerson.findFirst({
      where: { name: person.name }
    })
    
    if (existing) {
      results.push(existing)
    } else {
      const result = await prisma.financePerson.create({
        data: person
      })
      results.push(result)
    }
  }
  return results
}
