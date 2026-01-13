import { Request, Response } from 'express'
import { plainToInstance } from 'class-transformer'
import { inventoryItemService } from '~/services/inventoryItem.service'
import { ItemQueryDto } from '~/dtos/inventoryItem'
import { SuccessResponse } from '~/core/success.response'

class InventoryItemController {
  /**
   * Create new inventory item
   */
  createItem = async (req: Request, res: Response) => {
    const result = await inventoryItemService.createItem(req.body)
    new SuccessResponse({
      message: 'Tạo sản phẩm thành công',
      metaData: result
    }).send(res)
  }

  /**
   * Get all inventory items
   */
  getAllItems = async (req: Request, res: Response) => {
    const query = plainToInstance(ItemQueryDto, req.query)
    const result = await inventoryItemService.getAllItems(query)
    new SuccessResponse({
      message: 'Lấy danh sách sản phẩm thành công',
      metaData: result
    }).send(res)
  }

  /**
   * Get inventory item by ID
   */
  getItemById = async (req: Request, res: Response) => {
    const result = await inventoryItemService.getItemById(Number(req.params.id))
    new SuccessResponse({
      message: 'Lấy thông tin sản phẩm thành công',
      metaData: result
    }).send(res)
  }

  /**
   * Update inventory item
   */
  updateItem = async (req: Request, res: Response) => {
    const result = await inventoryItemService.updateItem(Number(req.params.id), req.body)
    new SuccessResponse({
      message: 'Cập nhật sản phẩm thành công',
      metaData: result
    }).send(res)
  }

  /**
   * Delete inventory item
   */
  deleteItem = async (req: Request, res: Response) => {
    const result = await inventoryItemService.deleteItem(Number(req.params.id))
    new SuccessResponse({
      message: 'Xóa sản phẩm thành công',
      metaData: result
    }).send(res)
  }

  /**
   * Batch update prices
   */
  updatePrices = async (req: Request, res: Response) => {
    const result = await inventoryItemService.updatePrices(req.body.items)
    new SuccessResponse({
      message: 'Cập nhật giá thành công',
      metaData: result
    }).send(res)
  }
}

export const inventoryItemController = new InventoryItemController()
