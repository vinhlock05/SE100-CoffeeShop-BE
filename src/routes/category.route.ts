import { Router } from 'express'
import { categoryController } from '~/controllers/category.controller'
import { dtoValidation } from '~/middlewares/dtoValidation.middleware'
import { accessTokenValidation } from '~/middlewares/auth.middleware'
import { wrapRequestHandler } from '~/utils/handler'
import { CreateCategoryDto, UpdateCategoryDto } from '~/dtos/category'

const categoryRouter = Router()

// Protected routes
categoryRouter.use(accessTokenValidation)

/**
 * @route   POST /api/categories
 * @desc    Create new category
 * @access  Private
 */
categoryRouter.post(
  '/',
  dtoValidation(CreateCategoryDto),
  wrapRequestHandler(categoryController.createCategory)
)

/**
 * @route   GET /api/categories
 * @desc    Get all categories
 * @access  Private
 */
categoryRouter.get(
  '/',
  wrapRequestHandler(categoryController.getAllCategories)
)

/**
 * @route   GET /api/categories/:id
 * @desc    Get category by ID
 * @access  Private
 */
categoryRouter.get(
  '/:id',
  wrapRequestHandler(categoryController.getCategoryById)
)

/**
 * @route   PATCH /api/categories/:id
 * @desc    Update category
 * @access  Private
 */
categoryRouter.patch(
  '/:id',
  dtoValidation(UpdateCategoryDto),
  wrapRequestHandler(categoryController.updateCategory)
)

/**
 * @route   DELETE /api/categories/:id
 * @desc    Delete category
 * @access  Private
 */
categoryRouter.delete(
  '/:id',
  wrapRequestHandler(categoryController.deleteCategory)
)

export default categoryRouter
