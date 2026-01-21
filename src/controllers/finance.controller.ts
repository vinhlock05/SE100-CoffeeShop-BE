import { Request, Response, NextFunction } from 'express'
import { financeService } from '~/services/finance.service'
import { SuccessResponse, CREATED } from '~/core/success.response'
import {
  CreateFinanceTransactionDto,
  UpdateFinanceTransactionDto,
  FinanceTransactionQueryDto
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

class FinanceController {
  // ===========================
  // TRANSACTIONS
  // ===========================


  async getTransactions(req: Request, res: Response, next: NextFunction) {
    const query = req.query as unknown as FinanceTransactionQueryDto
    const result = await financeService.getTransactions(query)
    new SuccessResponse({ message: 'success', metaData: result }).send(res)
  }

  async getTransactionById(req: Request, res: Response, next: NextFunction) {
    const id = Number(req.params.id)
    const result = await financeService.getTransactionById(id)
    new SuccessResponse({ message: 'success', metaData: result }).send(res)
  }

  async createTransaction(req: Request, res: Response, next: NextFunction) {
    const dto = req.body as CreateFinanceTransactionDto
    const staffId = (req as any).user?.staffId
    const result = await financeService.createTransaction(dto, staffId)
    new CREATED({ message: 'Tạo phiếu thành công', metaData: result }).send(res)
  }

  async updateTransaction(req: Request, res: Response, next: NextFunction) {
    const id = Number(req.params.id)
    const dto = req.body as UpdateFinanceTransactionDto
    const result = await financeService.updateTransaction(id, dto)
    new SuccessResponse({ message: 'Cập nhật phiếu thành công', metaData: result }).send(res)
  }

  async cancelTransaction(req: Request, res: Response, next: NextFunction) {
    const id = Number(req.params.id)
    const result = await financeService.cancelTransaction(id)
    new SuccessResponse({ message: 'Hủy phiếu thành công', metaData: result }).send(res)
  }

  async exportToExcel(req: Request, res: Response, next: NextFunction) {
    const query = req.query as unknown as FinanceTransactionQueryDto
    const buffer = await financeService.exportToExcel(query)
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', 'attachment; filename=so-quy.xlsx')
    res.send(buffer)
  }

  // ===========================
  // CATEGORIES
  // ===========================

  async getCategories(req: Request, res: Response, next: NextFunction) {
    const typeId = req.query.typeId ? Number(req.query.typeId) : undefined
    const result = await financeService.getCategories(typeId)
    new SuccessResponse({ message: 'success', metaData: result }).send(res)
  }

  async createCategory(req: Request, res: Response, next: NextFunction) {
    const dto = req.body as CreateFinanceCategoryDto
    const result = await financeService.createCategory(dto)
    new CREATED({ message: 'Tạo loại thu/chi thành công', metaData: result }).send(res)
  }

  async updateCategory(req: Request, res: Response, next: NextFunction) {
    const id = Number(req.params.id)
    const dto = req.body as UpdateFinanceCategoryDto
    const result = await financeService.updateCategory(id, dto)
    new SuccessResponse({ message: 'Cập nhật loại thu/chi thành công', metaData: result }).send(res)
  }

  async deleteCategory(req: Request, res: Response, next: NextFunction) {
    const id = Number(req.params.id)
    const result = await financeService.deleteCategory(id)
    new SuccessResponse({ message: 'Xóa loại thu/chi thành công', metaData: result }).send(res)
  }

  // ===========================
  // BANK ACCOUNTS
  // ===========================

  async getBankAccounts(req: Request, res: Response, next: NextFunction) {
    const result = await financeService.getBankAccounts()
    new SuccessResponse({ message: 'success', metaData: result }).send(res)
  }

  async createBankAccount(req: Request, res: Response, next: NextFunction) {
    const dto = req.body as CreateBankAccountDto
    const result = await financeService.createBankAccount(dto)
    new CREATED({ message: 'Tạo tài khoản ngân hàng thành công', metaData: result }).send(res)
  }

  async updateBankAccount(req: Request, res: Response, next: NextFunction) {
    const id = Number(req.params.id)
    const dto = req.body as UpdateBankAccountDto
    const result = await financeService.updateBankAccount(id, dto)
    new SuccessResponse({ message: 'Cập nhật tài khoản thành công', metaData: result }).send(res)
  }

  async deleteBankAccount(req: Request, res: Response, next: NextFunction) {
    const id = Number(req.params.id)
    const result = await financeService.deleteBankAccount(id)
    new SuccessResponse({ message: 'Xóa tài khoản thành công', metaData: result }).send(res)
  }

  // ===========================
  // FINANCE PERSONS
  // ===========================

  async getFinancePersons(req: Request, res: Response, next: NextFunction) {
    const query = req.query as unknown as FinancePersonQueryDto
    const result = await financeService.getFinancePersons(query)
    new SuccessResponse({ message: 'success', metaData: result }).send(res)
  }

  async createFinancePerson(req: Request, res: Response, next: NextFunction) {
    const dto = req.body as CreateFinancePersonDto
    const result = await financeService.createFinancePerson(dto)
    new CREATED({ message: 'Tạo người nộp/nhận thành công', metaData: result }).send(res)
  }

  async updateFinancePerson(req: Request, res: Response, next: NextFunction) {
    const id = Number(req.params.id)
    const dto = req.body as UpdateFinancePersonDto
    const result = await financeService.updateFinancePerson(id, dto)
    new SuccessResponse({ message: 'Cập nhật người nộp/nhận thành công', metaData: result }).send(res)
  }

  async deleteFinancePerson(req: Request, res: Response, next: NextFunction) {
    const id = Number(req.params.id)
    const result = await financeService.deleteFinancePerson(id)
    new SuccessResponse({ message: 'Xóa người nộp/nhận thành công', metaData: result }).send(res)
  }
}

export const financeController = new FinanceController()
