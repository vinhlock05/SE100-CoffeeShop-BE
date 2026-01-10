import { Router } from 'express'
import { pricingController } from '~/controllers/pricing.controller'
import { dtoValidation } from '~/middlewares/dtoValidation.middleware'
import { accessTokenValidation, requirePermission } from '~/middlewares/auth.middleware'
import { wrapRequestHandler } from '~/utils/handler'
import {
  PricingQueryDto,
  UpdateSinglePriceDto,
  UpdateCategoryPriceDto,
  BatchUpdatePriceDto
} from '~/dtos/pricing'

const pricingRouter = Router()

// Tất cả routes yêu cầu authentication
pricingRouter.use(accessTokenValidation)

/**
 * @route   GET /api/pricing
 * @desc    Lấy danh sách sản phẩm với thông tin giá
 *          - costPrice: giá vốn bình quân (avgUnitCost)
 *          - lastPurchasePrice: giá nhập cuối (từ batch gần nhất)
 *          - sellingPrice: giá bán
 *          - margin: lợi nhuận %
 * @access  Private - Yêu cầu quyền goods_pricing:view
 * @query   search, categoryId, itemTypeId, sortBy, sortOrder, page, limit
 */
pricingRouter.get('/',
  requirePermission('goods_pricing:view'),
  wrapRequestHandler(pricingController.getAll)
)

/**
 * @route   PATCH /api/pricing/single
 * @desc    Cập nhật giá cho 1 sản phẩm theo công thức
 *          - newPrice = basePrice + adjustment (VNĐ hoặc %)
 *          - baseType: current | cost | lastPurchase
 * @access  Private - Yêu cầu quyền goods_pricing:update
 * @body    { itemId, baseType?, adjustmentValue, adjustmentType? }
 */
pricingRouter.patch('/single',
  requirePermission('goods_pricing:update'),
  dtoValidation(UpdateSinglePriceDto),
  wrapRequestHandler(pricingController.updateSingle)
)

/**
 * @route   PATCH /api/pricing/category
 * @desc    Cập nhật giá cho tất cả sản phẩm trong 1 danh mục theo công thức
 * @access  Private - Yêu cầu quyền goods_pricing:update
 * @body    { categoryId, baseType?, adjustmentValue, adjustmentType? }
 */
pricingRouter.patch('/category',
  requirePermission('goods_pricing:update'),
  dtoValidation(UpdateCategoryPriceDto),
  wrapRequestHandler(pricingController.updateCategory)
)

/**
 * @route   PATCH /api/pricing/batch
 * @desc    Cập nhật giá trực tiếp cho nhiều sản phẩm
 * @access  Private - Yêu cầu quyền goods_pricing:update
 * @body    { items: [{ id, sellingPrice }] }
 */
pricingRouter.patch('/batch',
  requirePermission('goods_pricing:update'),
  dtoValidation(BatchUpdatePriceDto),
  wrapRequestHandler(pricingController.batchUpdate)
)

export default pricingRouter
