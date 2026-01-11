import { Request, Response } from 'express'
import { orderService } from '~/services/order.service'
import { SuccessResponse } from '~/core/success.response'

class OrderController {
  /**
   * Create new order
   */
  create = async (req: Request, res: Response) => {
    const staffId = (req as any).user?.staffId
    const result = await orderService.create(req.body, staffId)
    new SuccessResponse({
      message: 'Tạo đơn hàng thành công',
      metaData: result
    }).send(res)
  }

  /**
   * Get order by ID
   */
  getById = async (req: Request, res: Response) => {
    const result = await orderService.getById(Number(req.params.id))
    new SuccessResponse({
      message: 'Lấy đơn hàng thành công',
      metaData: result
    }).send(res)
  }

  /**
   * Get all orders with filters
   */
  getAll = async (req: Request, res: Response) => {
    const result = await orderService.getAll(req.query as any)
    new SuccessResponse({
      message: 'Lấy danh sách đơn hàng thành công',
      metaData: result
    }).send(res)
  }

  /**
   * Update order
   */
  update = async (req: Request, res: Response) => {
    const result = await orderService.update(Number(req.params.id), req.body)
    new SuccessResponse({
      message: 'Cập nhật đơn hàng thành công',
      metaData: result
    }).send(res)
  }

  /**
   * Add item to order
   */
  addItem = async (req: Request, res: Response) => {
    const result = await orderService.addItem(Number(req.params.id), req.body)
    new SuccessResponse({
      message: 'Thêm món thành công',
      metaData: result
    }).send(res)
  }



  /**
   * Remove item from order
   */
  removeItem = async (req: Request, res: Response) => {
    const result = await orderService.removeItem(
      Number(req.params.id),
      Number(req.params.itemId)
    )
    new SuccessResponse({
      message: 'Xóa món thành công',
      metaData: result
    }).send(res)
  }

  /**
   * Send order to kitchen
   */
  sendToKitchen = async (req: Request, res: Response) => {
    const result = await orderService.sendToKitchen(Number(req.params.id))
    new SuccessResponse({
      message: 'Đã gửi đơn hàng đến bếp',
      metaData: result
    }).send(res)
  }

  /**
   * Checkout order
   */
  checkout = async (req: Request, res: Response) => {
    const result = await orderService.checkout(Number(req.params.id), req.body)
    new SuccessResponse({
      message: 'Thanh toán thành công',
      metaData: result
    }).send(res)
  }

  /**
   * Cancel order
   */
  cancel = async (req: Request, res: Response) => {
    const result = await orderService.cancel(Number(req.params.id), req.body.reason)
    new SuccessResponse({
      message: 'Đã hủy đơn hàng',
      metaData: result
    }).send(res)
  }

  /**
   * Get orders by table
   */
  getByTable = async (req: Request, res: Response) => {
    const result = await orderService.getByTable(Number(req.params.tableId))
    new SuccessResponse({
      message: result ? 'Lấy đơn hàng theo bàn' : 'Bàn chưa có đơn hàng',
      metaData: result || undefined
    }).send(res)
  }



  // ========================================
  // NEW: Item Management
  // ========================================

  /**
   * Update order item (quantity, notes, customization, status)
   */
  updateOrderItem = async (req: Request, res: Response) => {
    const result = await orderService.updateOrderItem(
      Number(req.params.id),
      Number(req.params.itemId),
      req.body
    )
    new SuccessResponse({
      message: 'Cập nhật món thành công',
      metaData: result
    }).send(res)
  }

  /**
   * Reduce/cancel item with reason
   */
  reduceItem = async (req: Request, res: Response) => {
    const result = await orderService.reduceItem(
      Number(req.params.id),
      Number(req.params.itemId),
      req.body
    )
    new SuccessResponse({
      message: 'Giảm/hủy món thành công',
      metaData: result
    }).send(res)
  }



  // ========================================
  // NEW: Kitchen Display
  // ========================================

  /**
   * Get items for kitchen display
   */
  getKitchenItems = async (req: Request, res: Response) => {
    const result = await orderService.getKitchenItems(req.query as any)
    new SuccessResponse({
      message: 'Lấy danh sách món cho bếp',
      metaData: result
    }).send(res)
  }

  /**
   * Get recipe for an item
   */
  getItemRecipe = async (req: Request, res: Response) => {
    const result = await orderService.getItemRecipe(Number(req.params.itemId))
    new SuccessResponse({
      message: 'Lấy công thức',
      metaData: result
    }).send(res)
  }

  /**
   * Report item out of stock
   */
  reportOutOfStock = async (req: Request, res: Response) => {
    const result = await orderService.reportOutOfStock(Number(req.params.itemId), req.body)
    new SuccessResponse({
      message: 'Đã báo hết hàng',
      metaData: result
    }).send(res)
  }

  // ========================================
  // NEW: Table Operations
  // ========================================

  /**
   * Transfer order to new table
   */
  transferTable = async (req: Request, res: Response) => {
    const result = await orderService.transferTable(Number(req.params.id), req.body.newTableId)
    new SuccessResponse({
      message: 'Chuyển bàn thành công',
      metaData: result
    }).send(res)
  }

  /**
   * Merge orders
   */
  mergeOrders = async (req: Request, res: Response) => {
    const result = await orderService.mergeOrders(Number(req.params.id), req.body.fromOrderId)
    new SuccessResponse({
      message: 'Gộp đơn thành công',
      metaData: result
    }).send(res)
  }

  /**
   * Split order
   */
  splitOrder = async (req: Request, res: Response) => {
    const result = await orderService.splitOrder(Number(req.params.id), req.body)
    new SuccessResponse({
      message: 'Tách đơn thành công',
      metaData: result
    }).send(res)
  }

  /**
   * Get table order history
   */
  getTableHistory = async (req: Request, res: Response) => {
    const result = await orderService.getTableHistory(Number(req.params.tableId))
    new SuccessResponse({
      message: 'Lấy lịch sử đơn hàng',
      metaData: result
    }).send(res)
  }
  /**
   * Batch update item status
   */
  updateItemStatus = async (req: Request, res: Response) => {
    const { itemId } = req.params
    const result = await orderService.updateItemStatus(Number(itemId), req.body)
    
    new SuccessResponse({
      message: 'Cập nhật trạng thái thành công',
      metaData: result
    }).send(res)
  }
}

export const orderController = new OrderController()

