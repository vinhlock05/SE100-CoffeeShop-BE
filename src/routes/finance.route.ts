import { Router } from 'express'
import { financeController } from '~/controllers/finance.controller'
import { dtoValidation } from '~/middlewares/dtoValidation.middleware'
import { accessTokenValidation, requirePermission } from '~/middlewares/auth.middleware'
import { parseSort } from '~/middlewares/common.middlewares'
import { wrapRequestHandler } from '~/utils/handler'
import {
  CreateFinanceTransactionDto,
  UpdateFinanceTransactionDto
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
  UpdateFinancePersonDto
} from '~/dtos/finance/person.dto'

const financeRouter = Router()

// All routes require authentication
financeRouter.use(accessTokenValidation)

// ========================================
// TRANSACTIONS
// ========================================



/**
 * @route   GET /api/finance/transactions
 * @desc    Get all transactions with filters
 */
financeRouter.get(
  '/transactions',
  requirePermission('finance:view'),
  wrapRequestHandler(parseSort({ allowSortList: ['code', 'transactionDate', 'amount', 'createdAt'] })),
  wrapRequestHandler(financeController.getTransactions)
)

/**
 * @route   GET /api/finance/transactions/:id
 * @desc    Get transaction by ID
 */
financeRouter.get(
  '/transactions/:id',
  requirePermission('finance:view'),
  wrapRequestHandler(financeController.getTransactionById)
)

/**
 * @route   POST /api/finance/transactions
 * @desc    Create new transaction (Phiếu thu/chi)
 */
financeRouter.post(
  '/transactions',
  requirePermission('finance:create'),
  dtoValidation(CreateFinanceTransactionDto),
  wrapRequestHandler(financeController.createTransaction)
)

/**
 * @route   PATCH /api/finance/transactions/:id
 * @desc    Update transaction
 */
financeRouter.patch(
  '/transactions/:id',
  requirePermission('finance:update'),
  dtoValidation(UpdateFinanceTransactionDto),
  wrapRequestHandler(financeController.updateTransaction)
)

/**
 * @route   DELETE /api/finance/transactions/:id
 * @desc    Cancel transaction
 */
financeRouter.delete(
  '/transactions/:id',
  requirePermission('finance:delete'),
  wrapRequestHandler(financeController.cancelTransaction)
)

/**
 * @route   GET /api/finance/export
 * @desc    Export transactions to Excel
 */
financeRouter.get(
  '/export',
  requirePermission('finance:view'),
  wrapRequestHandler(parseSort({ allowSortList: ['code', 'transactionDate', 'amount', 'createdAt'] })),
  wrapRequestHandler(financeController.exportToExcel)
)

// ========================================
// CATEGORIES
// ========================================

/**
 * @route   GET /api/finance/categories
 * @desc    Get all categories (optionally filtered by typeId)
 */
financeRouter.get(
  '/categories',
  wrapRequestHandler(financeController.getCategories)
)

/**
 * @route   POST /api/finance/categories
 * @desc    Create new category
 */
financeRouter.post(
  '/categories',
  dtoValidation(CreateFinanceCategoryDto),
  wrapRequestHandler(financeController.createCategory)
)

/**
 * @route   PATCH /api/finance/categories/:id
 * @desc    Update category
 */
financeRouter.patch(
  '/categories/:id',
  dtoValidation(UpdateFinanceCategoryDto),
  wrapRequestHandler(financeController.updateCategory)
)

/**
 * @route   DELETE /api/finance/categories/:id
 * @desc    Delete category
 */
financeRouter.delete(
  '/categories/:id',
  wrapRequestHandler(financeController.deleteCategory)
)

// ========================================
// BANK ACCOUNTS
// ========================================

/**
 * @route   GET /api/finance/bank-accounts
 * @desc    Get all bank accounts
 */
financeRouter.get(
  '/bank-accounts',
  wrapRequestHandler(financeController.getBankAccounts)
)

/**
 * @route   POST /api/finance/bank-accounts
 * @desc    Create new bank account
 */
financeRouter.post(
  '/bank-accounts',
  dtoValidation(CreateBankAccountDto),
  wrapRequestHandler(financeController.createBankAccount)
)

/**
 * @route   PATCH /api/finance/bank-accounts/:id
 * @desc    Update bank account
 */
financeRouter.patch(
  '/bank-accounts/:id',
  dtoValidation(UpdateBankAccountDto),
  wrapRequestHandler(financeController.updateBankAccount)
)

/**
 * @route   DELETE /api/finance/bank-accounts/:id
 * @desc    Delete bank account
 */
financeRouter.delete(
  '/bank-accounts/:id',
  wrapRequestHandler(financeController.deleteBankAccount)
)

// ========================================
// FINANCE PERSONS
// ========================================

/**
 * @route   GET /api/finance/persons
 * @desc    Get all finance persons
 */
financeRouter.get(
  '/persons',
  wrapRequestHandler(financeController.getFinancePersons)
)

/**
 * @route   POST /api/finance/persons
 * @desc    Create new finance person
 */
financeRouter.post(
  '/persons',
  dtoValidation(CreateFinancePersonDto),
  wrapRequestHandler(financeController.createFinancePerson)
)

/**
 * @route   PATCH /api/finance/persons/:id
 * @desc    Update finance person
 */
financeRouter.patch(
  '/persons/:id',
  dtoValidation(UpdateFinancePersonDto),
  wrapRequestHandler(financeController.updateFinancePerson)
)

/**
 * @route   DELETE /api/finance/persons/:id
 * @desc    Delete finance person
 */
financeRouter.delete(
  '/persons/:id',
  wrapRequestHandler(financeController.deleteFinancePerson)
)

export default financeRouter
