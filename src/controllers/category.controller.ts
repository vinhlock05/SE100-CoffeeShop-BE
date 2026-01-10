import { Request, Response } from 'express'
import { categoryService } from '~/services/category.service'
import { SuccessResponse } from '~/core/success.response'

class CategoryController {
  /**
   * Create new category
   */
  createCategory = async (req: Request, res: Response) => {
    const result = await categoryService.createCategory(req.body)
    new SuccessResponse({
      message: 'Tạo danh mục thành công',
      metaData: result
    }).send(res)
  }

  /**
   * Get all categories
   */
  getAllCategories = async (req: Request, res: Response) => {
    const result = await categoryService.getAllCategories()
    new SuccessResponse({
      message: 'Lấy danh sách danh mục thành công',
      metaData: result
    }).send(res)
  }

  /**
   * Get category by ID
   */
  getCategoryById = async (req: Request, res: Response) => {
    const result = await categoryService.getCategoryById(Number(req.params.id))
    new SuccessResponse({
      message: 'Lấy thông tin danh mục thành công',
      metaData: result
    }).send(res)
  }

  /**
   * Update category
   */
  updateCategory = async (req: Request, res: Response) => {
    const result = await categoryService.updateCategory(Number(req.params.id), req.body)
    new SuccessResponse({
      message: 'Cập nhật danh mục thành công',
      metaData: result
    }).send(res)
  }

  /**
   * Delete category
   */
  deleteCategory = async (req: Request, res: Response) => {
    const result = await categoryService.deleteCategory(Number(req.params.id))
    new SuccessResponse({
      message: 'Xóa danh mục thành công',
      metaData: result
    }).send(res)
  }
}

export const categoryController = new CategoryController()
