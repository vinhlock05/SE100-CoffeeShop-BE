import { Request, Response } from 'express'
import { uploadService } from '~/services/upload.service'
import { SuccessResponse } from '~/core/success.response'

class UploadController {
  /**
   * Upload 1 ảnh
   * POST /upload/image
   */
  uploadImage = async (req: Request, res: Response) => {
    const file = req.file
    const folder = req.body.folder || 'products'
    
    const result = await uploadService.uploadImage(file as Express.Multer.File, folder)
    
    new SuccessResponse({
      message: 'Upload ảnh thành công',
      metaData: result
    }).send(res)
  }

  /**
   * Upload nhiều ảnh
   * POST /upload/images
   */
  uploadMultipleImages = async (req: Request, res: Response) => {
    const files = req.files as Express.Multer.File[]
    const folder = req.body.folder || 'products'
    
    const results = await uploadService.uploadMultipleImages(files, folder)
    
    new SuccessResponse({
      message: `Upload ${results.length} ảnh thành công`,
      metaData: results
    }).send(res)
  }

  /**
   * Xóa ảnh
   * DELETE /upload/image
   */
  deleteImage = async (req: Request, res: Response) => {
    const { publicId } = req.body
    
    const result = await uploadService.deleteImage(publicId)
    
    new SuccessResponse({
      message: 'Xóa ảnh thành công',
      metaData: result
    }).send(res)
  }
}

export const uploadController = new UploadController()
