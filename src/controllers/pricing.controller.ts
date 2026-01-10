import { Request, Response, NextFunction } from 'express'
import { pricingService } from '~/services/pricing.service'
import { SuccessResponse } from '~/core/success.response'
import { 
  PricingQueryDto, 
  UpdateSinglePriceDto, 
  UpdateCategoryPriceDto,
  BatchUpdatePriceDto
} from '~/dtos/pricing'

class PricingController {
  /**
   * GET /pricing - Lấy danh sách sản phẩm với thông tin giá
   */
  async getAll(req: Request, res: Response, next: NextFunction) {
    const result = await pricingService.getAll(req.query as unknown as PricingQueryDto)
    new SuccessResponse({
      message: 'Lấy danh sách giá thành công',
      metaData: result
    }).send(res)
  }

  /**
   * PATCH /pricing/single - Cập nhật giá cho 1 sản phẩm
   */
  async updateSingle(req: Request, res: Response, next: NextFunction) {
    const result = await pricingService.updateSinglePrice(req.body as UpdateSinglePriceDto)
    new SuccessResponse({
      message: result.message,
      metaData: result
    }).send(res)
  }

  /**
   * PATCH /pricing/category - Cập nhật giá cho tất cả sản phẩm trong danh mục
   */
  async updateCategory(req: Request, res: Response, next: NextFunction) {
    const result = await pricingService.updateCategoryPrices(req.body as UpdateCategoryPriceDto)
    new SuccessResponse({
      message: result.message,
      metaData: result
    }).send(res)
  }

  /**
   * PATCH /pricing/batch - Cập nhật giá trực tiếp cho nhiều sản phẩm
   */
  async batchUpdate(req: Request, res: Response, next: NextFunction) {
    const result = await pricingService.batchUpdatePrices(req.body as BatchUpdatePriceDto)
    new SuccessResponse({
      message: result.message,
      metaData: result
    }).send(res)
  }
}

export const pricingController = new PricingController()
