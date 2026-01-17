import { prisma } from '~/config/database'
import { BadRequestError, NotFoundRequestError } from '~/core/error.response'
import {
  CreateFinanceTransactionDto,
  UpdateFinanceTransactionDto,
  FinanceTransactionQueryDto,
  CashBookStatsQueryDto
} from '~/dtos/finance/transaction.dto'
import {
  CreateFinanceCategoryDto,
  UpdateFinanceCategoryDto
} from '~/dtos/finance/category.dto'
import {
  CreateBankAccountDto,
  UpdateBankAccountDto
} from '~/dtos/finance/bankAccount.dto'
import {
  CreateFinancePersonDto,
  UpdateFinancePersonDto,
  FinancePersonQueryDto
} from '~/dtos/finance/person.dto'
import { Prisma } from '@prisma/client'
import ExcelJS from 'exceljs'

class FinanceService {
  // ===========================
  // TRANSACTIONS
  // ===========================

  /**
   * Generate transaction code based on referenceType and paymentMethod
   * Examples:
   * - purchase_order → PCPN000001
   * - order (Thu) → PTHD000001, order (Chi) → PCHD000001
   * - payroll → PCPL000001
   * - Manual + Cash + Thu → PTTM000001, Chi → PCTM000001
   * - Manual + Bank + Thu → PTNH000001, Chi → PCNH000001
   */
  async generateTransactionCode(
    typeId: number,
    referenceType?: string,
    paymentMethod?: string
  ): Promise<string> {
    let prefix: string

    if (referenceType === 'purchase_order') {
      // Phiếu chi phiếu nhập
      prefix = 'PCPN'
    } else if (referenceType === 'order') {
      // Phiếu thanh toán hoá đơn
      prefix = 'TTHD'
    } else if (referenceType === 'payroll') {
      // Phiếu chi lương
      prefix = 'PCPL'
    } else {
      // Manual: dựa vào typeId (Thu/Chi) và paymentMethod (TM/NH)
      const typePrefix = typeId === 1 ? 'PT' : 'PC'
      const methodSuffix = paymentMethod === 'bank' ? 'NH' : 'TM'
      prefix = `${typePrefix}${methodSuffix}`
    }
    
    // Get the last transaction with this prefix
    const lastTransaction = await prisma.financeTransaction.findFirst({
      where: {
        code: { startsWith: prefix }
      },
      orderBy: { code: 'desc' }
    })

    let nextNumber = 1
    if (lastTransaction) {
      // Extract number after prefix (prefix length varies: 2-4 chars)
      const lastNumber = parseInt(lastTransaction.code.slice(prefix.length))
      nextNumber = lastNumber + 1
    }

    return `${prefix}${String(nextNumber).padStart(6, '0')}`
  }

  /**
   * Create finance transaction
   */
  async createTransaction(dto: CreateFinanceTransactionDto, createdBy?: number, tx?: Prisma.TransactionClient) {
    const db = tx || prisma

    // Get category to determine type
    const category = await db.financeCategory.findUnique({
      where: { id: dto.categoryId },
      include: { type: true }
    })

    if (!category) {
      throw new NotFoundRequestError('Loại thu/chi không tồn tại')
    }

    // Validate bank account if payment method is bank
    if (dto.paymentMethod === 'bank' && !dto.bankAccountId) {
      throw new BadRequestError({ message: 'Vui lòng chọn tài khoản ngân hàng' })
    }

    const code = await this.generateTransactionCode(
      category.typeId,
      dto.referenceType,
      dto.paymentMethod
    )

    const transaction = await db.financeTransaction.create({
      data: {
        code,
        categoryId: dto.categoryId,
        amount: dto.amount,
        paymentMethod: dto.paymentMethod,
        bankAccountId: dto.bankAccountId,
        personType: dto.personType,
        personId: dto.personId,
        personName: dto.personName,
        personPhone: dto.personPhone,
        transactionDate: dto.transactionDate ? new Date(dto.transactionDate) : new Date(),
        notes: dto.notes,
        referenceType: dto.referenceType,
        referenceId: dto.referenceId,
        createdBy,
        status: 'completed'
      },
      include: {
        category: { include: { type: true } },
        bankAccount: true,
        creator: { select: { id: true, fullName: true } }
      }
    })

    return transaction
  }

  /**
   * Get transactions with filters and pagination
   */
  async getTransactions(query: FinanceTransactionQueryDto) {
    const page = Number(query.page) || 1
    const limit = Number(query.limit) || 20
    const skip = (page - 1) * limit

    const where: Prisma.FinanceTransactionWhereInput = {}

    // Search in code, notes, personName, personPhone
    if (query.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { notes: { contains: query.search, mode: 'insensitive' } },
        { personName: { contains: query.search, mode: 'insensitive' } },
        { personPhone: { contains: query.search, mode: 'insensitive' } }
      ]
    }

    // Filter by type (Thu/Chi)
    if (query.typeId) {
      where.category = { typeId: Number(query.typeId) }
    }

    // Filter by categories
    if (query.categoryIds && query.categoryIds.length > 0) {
      const ids = query.categoryIds.map(id => Number(id))
      where.categoryId = { in: ids }
    }

    // Filter by payment method
    if (query.paymentMethod) {
      where.paymentMethod = query.paymentMethod
    }

    // Filter by status
    if (query.status) {
      where.status = query.status
    }

    // Filter by creators
    if (query.creatorIds && query.creatorIds.length > 0) {
      const ids = query.creatorIds.map(id => Number(id))
      where.createdBy = { in: ids }
    }

    // Filter by date range
    if (query.dateFrom || query.dateTo) {
      where.transactionDate = {}
      if (query.dateFrom) {
        where.transactionDate.gte = new Date(query.dateFrom)
      }
      if (query.dateTo) {
        const endDate = new Date(query.dateTo)
        endDate.setHours(23, 59, 59, 999)
        where.transactionDate.lte = endDate
      }
    }

    // Build orderBy from sort
    let orderBy: Prisma.FinanceTransactionOrderByWithRelationInput[] = [{ transactionDate: 'desc' }]
    if (query.sort) {
      orderBy = Object.entries(query.sort).map(([field, direction]) => ({
        [field]: direction.toLowerCase()
      }))
    }

    const [transactions, total] = await Promise.all([
      prisma.financeTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          category: { include: { type: true } },
          bankAccount: true,
          creator: { select: { id: true, fullName: true } }
        }
      }),
      prisma.financeTransaction.count({ where })
    ])

    // Calculate stats for the filtered period
    const stats = await this.getCashBookStats({
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      paymentMethod: query.paymentMethod
    })

    return {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      total,
      transactions,
      stats
    }
  }

  /**
   * Get transaction by ID
   */
  async getTransactionById(id: number) {
    const transaction = await prisma.financeTransaction.findUnique({
      where: { id },
      include: {
        category: { include: { type: true } },
        bankAccount: true,
        creator: { select: { id: true, fullName: true } }
      }
    })

    if (!transaction) {
      throw new NotFoundRequestError('Không tìm thấy phiếu thu/chi')
    }

    return transaction
  }

  /**
   * Update transaction
   * - If no referenceType: can update notes, transactionDate, amount, categoryId
   * - If has referenceType: can only update notes, transactionDate
   */
  async updateTransaction(id: number, dto: UpdateFinanceTransactionDto) {
    const transaction = await this.getTransactionById(id)

    if (transaction.status === 'cancelled') {
      throw new BadRequestError({ message: 'Không thể cập nhật phiếu đã hủy' })
    }

    const updateData: Prisma.FinanceTransactionUpdateInput = {}

    // Always allowed
    if (dto.notes !== undefined) updateData.notes = dto.notes
    if (dto.transactionDate) updateData.transactionDate = new Date(dto.transactionDate)

    // Only allowed if no referenceType (manually created)
    if (!transaction.referenceType) {
      if (dto.amount !== undefined) updateData.amount = dto.amount
      if (dto.categoryId !== undefined) {
        // Validate new category exists and matches same type
        const newCategory = await prisma.financeCategory.findUnique({
          where: { id: dto.categoryId }
        })
        if (!newCategory) {
          throw new NotFoundRequestError('Loại thu/chi không tồn tại')
        }
        updateData.categoryId = dto.categoryId
      }
    } else {
      // Has referenceType - reject amount/categoryId changes
      if (dto.amount !== undefined || dto.categoryId !== undefined) {
        throw new BadRequestError({ 
          message: 'Không thể thay đổi số tiền hoặc loại thu/chi của phiếu liên kết từ module khác' 
        })
      }
    }

    const updated = await prisma.financeTransaction.update({
      where: { id },
      data: updateData,
      include: {
        category: { include: { type: true } },
        bankAccount: true,
        creator: { select: { id: true, fullName: true } }
      }
    })

    return updated
  }

  /**
   * Cancel transaction (soft delete via status)
   */
  async cancelTransaction(id: number) {
    const transaction = await this.getTransactionById(id)

    if (transaction.status === 'cancelled') {
      throw new BadRequestError({ message: 'Phiếu đã được hủy trước đó' })
    }

    const updated = await prisma.financeTransaction.update({
      where: { id },
      data: { status: 'cancelled' },
      include: {
        category: { include: { type: true } },
        bankAccount: true,
        creator: { select: { id: true, fullName: true } }
      }
    })

    return updated
  }

  /**
   * Get cash book statistics
   */
  async getCashBookStats(query: CashBookStatsQueryDto) {
    const where: Prisma.FinanceTransactionWhereInput = {
      status: 'completed'
    }

    if (query.paymentMethod) {
      where.paymentMethod = query.paymentMethod
    }

    // Date range for current period stats
    const dateFrom = query.dateFrom ? new Date(query.dateFrom) : undefined
    const dateTo = query.dateTo ? new Date(query.dateTo) : undefined

    if (dateTo) {
      dateTo.setHours(23, 59, 59, 999)
    }

    // Calculate opening balance (sum of all transactions before dateFrom)
    let openingBalance = 0
    if (dateFrom) {
      const beforePeriod = await prisma.financeTransaction.findMany({
        where: {
          ...where,
          transactionDate: { lt: dateFrom }
        },
        include: { category: true }
      })

      openingBalance = beforePeriod.reduce((sum, t) => {
        const amount = Number(t.amount)
        return t.category.typeId === 1 ? sum + amount : sum - amount
      }, 0)
    }

    // Get transactions in the period
    const periodWhere: Prisma.FinanceTransactionWhereInput = { ...where }
    if (dateFrom || dateTo) {
      periodWhere.transactionDate = {}
      if (dateFrom) periodWhere.transactionDate.gte = dateFrom
      if (dateTo) periodWhere.transactionDate.lte = dateTo
    }

    const periodTransactions = await prisma.financeTransaction.findMany({
      where: periodWhere,
      include: { category: true }
    })

    // Calculate totals
    let totalIncome = 0
    let totalExpense = 0

    for (const t of periodTransactions) {
      const amount = Number(t.amount)
      if (t.category.typeId === 1) {
        totalIncome += amount
      } else {
        totalExpense += amount
      }
    }

    const closingBalance = openingBalance + totalIncome - totalExpense

    return {
      openingBalance,
      totalIncome,
      totalExpense,
      closingBalance
    }
  }

  // ===========================
  // CATEGORIES
  // ===========================

  /**
   * Get all categories (optionally filtered by typeId)
   */
  async getCategories(typeId?: number) {
    const where: Prisma.FinanceCategoryWhereInput = {
      deletedAt: null
    }

    if (typeId) {
      where.typeId = typeId
    }

    return prisma.financeCategory.findMany({
      where,
      include: { type: true },
      orderBy: { name: 'asc' }
    })
  }

  /**
   * Create category
   */
  async createCategory(dto: CreateFinanceCategoryDto) {
    // Validate type exists
    const type = await prisma.financeType.findUnique({
      where: { id: dto.typeId }
    })

    if (!type) {
      throw new BadRequestError({ message: 'Loại thu/chi không hợp lệ' })
    }

    // Check duplicate name within same type
    const existing = await prisma.financeCategory.findFirst({
      where: {
        name: dto.name,
        typeId: dto.typeId,
        deletedAt: null
      }
    })

    if (existing) {
      throw new BadRequestError({ message: 'Tên loại thu/chi đã tồn tại' })
    }

    return prisma.financeCategory.create({
      data: {
        name: dto.name,
        typeId: dto.typeId
      },
      include: { type: true }
    })
  }

  /**
   * Update category
   */
  async updateCategory(id: number, dto: UpdateFinanceCategoryDto) {
    const category = await prisma.financeCategory.findUnique({
      where: { id, deletedAt: null }
    })

    if (!category) {
      throw new NotFoundRequestError('Loại thu/chi không tồn tại')
    }

    if (dto.name) {
      // Check duplicate
      const existing = await prisma.financeCategory.findFirst({
        where: {
          name: dto.name,
          typeId: category.typeId,
          id: { not: id },
          deletedAt: null
        }
      })

      if (existing) {
        throw new BadRequestError({ message: 'Tên loại thu/chi đã tồn tại' })
      }
    }

    return prisma.financeCategory.update({
      where: { id },
      data: { name: dto.name },
      include: { type: true }
    })
  }

  /**
   * Delete category (soft delete)
   */
  async deleteCategory(id: number) {
    const category = await prisma.financeCategory.findUnique({
      where: { id, deletedAt: null }
    })

    if (!category) {
      throw new NotFoundRequestError('Loại thu/chi không tồn tại')
    }

    // Check if category is used
    const usageCount = await prisma.financeTransaction.count({
      where: { categoryId: id }
    })

    if (usageCount > 0) {
      throw new BadRequestError({ 
        message: `Không thể xóa loại thu/chi đang được sử dụng (${usageCount} giao dịch)` 
      })
    }

    return prisma.financeCategory.update({
      where: { id },
      data: { deletedAt: new Date() }
    })
  }

  // ===========================
  // BANK ACCOUNTS
  // ===========================

  /**
   * Get all bank accounts
   */
  async getBankAccounts() {
    return prisma.bankAccount.findMany({
      where: { deletedAt: null },
      orderBy: { accountName: 'asc' }
    })
  }

  /**
   * Create bank account
   */
  async createBankAccount(dto: CreateBankAccountDto) {
    // Check unique account number
    const existing = await prisma.bankAccount.findFirst({
      where: { accountNumber: dto.accountNumber, deletedAt: null }
    })

    if (existing) {
      throw new BadRequestError({ message: 'Số tài khoản đã tồn tại' })
    }

    return prisma.bankAccount.create({
      data: {
        accountName: dto.accountName,
        accountNumber: dto.accountNumber,
        bankName: dto.bankName,
        ownerName: dto.ownerName,
        notes: dto.notes
      }
    })
  }

  /**
   * Update bank account
   */
  async updateBankAccount(id: number, dto: UpdateBankAccountDto) {
    const account = await prisma.bankAccount.findUnique({
      where: { id, deletedAt: null }
    })

    if (!account) {
      throw new NotFoundRequestError('Tài khoản ngân hàng không tồn tại')
    }

    return prisma.bankAccount.update({
      where: { id },
      data: {
        accountName: dto.accountName,
        ownerName: dto.ownerName,
        notes: dto.notes,
        isActive: dto.isActive
      }
    })
  }

  /**
   * Delete bank account (soft delete)
   */
  async deleteBankAccount(id: number) {
    const account = await prisma.bankAccount.findUnique({
      where: { id, deletedAt: null }
    })

    if (!account) {
      throw new NotFoundRequestError('Tài khoản ngân hàng không tồn tại')
    }

    // Check if bank account is used
    const usageCount = await prisma.financeTransaction.count({
      where: { bankAccountId: id }
    })

    if (usageCount > 0) {
      throw new BadRequestError({ 
        message: `Không thể xóa tài khoản đang được sử dụng (${usageCount} giao dịch)` 
      })
    }

    return prisma.bankAccount.update({
      where: { id },
      data: { deletedAt: new Date() }
    })
  }

  // ===========================
  // FINANCE PERSONS
  // ===========================

  /**
   * Get finance persons with optional search
   */
  async getFinancePersons(query: FinancePersonQueryDto) {
    const page = Number(query.page) || 1
    const limit = Number(query.limit) || 20
    const skip = (page - 1) * limit

    const where: Prisma.FinancePersonWhereInput = {
      deletedAt: null
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } }
      ]
    }

    const [data, total] = await Promise.all([
      prisma.financePerson.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' }
      }),
      prisma.financePerson.count({ where })
    ])

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  }

  /**
   * Create finance person
   */
  async createFinancePerson(dto: CreateFinancePersonDto) {
    return prisma.financePerson.create({
      data: {
        name: dto.name,
        phone: dto.phone,
        address: dto.address,
        notes: dto.notes
      }
    })
  }

  /**
   * Update finance person
   */
  async updateFinancePerson(id: number, dto: UpdateFinancePersonDto) {
    const person = await prisma.financePerson.findUnique({
      where: { id, deletedAt: null }
    })

    if (!person) {
      throw new NotFoundRequestError('Không tìm thấy người nộp/nhận')
    }

    return prisma.financePerson.update({
      where: { id },
      data: {
        name: dto.name,
        phone: dto.phone,
        address: dto.address,
        notes: dto.notes
      }
    })
  }

  /**
   * Delete finance person (soft delete)
   */
  async deleteFinancePerson(id: number) {
    const person = await prisma.financePerson.findUnique({
      where: { id, deletedAt: null }
    })

    if (!person) {
      throw new NotFoundRequestError('Không tìm thấy người nộp/nhận')
    }

    return prisma.financePerson.update({
      where: { id },
      data: { deletedAt: new Date() }
    })
  }

  // ===========================
  // EXPORT
  // ===========================

  /**
   * Export transactions to Excel
   */
  async exportToExcel(query: FinanceTransactionQueryDto): Promise<Buffer> {
    // Get all transactions matching query (no pagination)
    const originalLimit = query.limit
    query.limit = 10000  // Max records
    const { transactions } = await this.getTransactions(query)
    query.limit = originalLimit

    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Sổ quỹ')

    // Define columns
    worksheet.columns = [
      { header: 'Mã phiếu', key: 'code', width: 15 },
      { header: 'Thời gian', key: 'transactionDate', width: 20 },
      { header: 'Loại', key: 'type', width: 10 },
      { header: 'Danh mục', key: 'category', width: 20 },
      { header: 'Người nộp/nhận', key: 'personName', width: 25 },
      { header: 'SĐT', key: 'personPhone', width: 15 },
      { header: 'Số tiền', key: 'amount', width: 18 },
      { header: 'Phương thức', key: 'paymentMethod', width: 15 },
      { header: 'Trạng thái', key: 'status', width: 15 },
      { header: 'Ghi chú', key: 'notes', width: 30 },
      { header: 'Người tạo', key: 'creator', width: 20 }
    ]

    // Style header
    worksheet.getRow(1).font = { bold: true }
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    }

    // Add data rows
    for (const t of transactions) {
      const isIncome = t.category.typeId === 1
      worksheet.addRow({
        code: t.code,
        transactionDate: t.transactionDate.toLocaleString('vi-VN'),
        type: isIncome ? 'Thu' : 'Chi',
        category: t.category.name,
        personName: t.personName || '',
        personPhone: t.personPhone || '',
        amount: isIncome ? Number(t.amount) : -Number(t.amount),
        paymentMethod: t.paymentMethod === 'cash' ? 'Tiền mặt' : 'Ngân hàng',
        status: t.status === 'completed' ? 'Hoàn thành' : 'Đã hủy',
        notes: t.notes || '',
        creator: t.creator?.fullName || ''
      })
    }

    // Format amount column
    worksheet.getColumn('amount').numFmt = '#,##0'

    const buffer = await workbook.xlsx.writeBuffer()
    return Buffer.from(buffer)
  }
}

export const financeService = new FinanceService()
