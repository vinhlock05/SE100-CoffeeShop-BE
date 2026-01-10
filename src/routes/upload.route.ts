import { Router } from 'express'
import multer from 'multer'
import { uploadController } from '~/controllers/upload.controller'
import { accessTokenValidation, requirePermission } from '~/middlewares/auth.middleware'
import { wrapRequestHandler } from '~/utils/handler'

const uploadRouter = Router()

// Cấu hình multer để lưu file trong memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 10 // Max 10 files
  }
})

// Yêu cầu xác thực cho tất cả routes
uploadRouter.use(accessTokenValidation)

/**
 * @route   POST /api/upload/image
 * @desc    Upload 1 ảnh lên Cloudinary
 * @access  Private - Yêu cầu đăng nhập
 * @body    multipart/form-data: { file: File, folder?: string }
 * @returns { url, publicId, width, height, format }
 */
uploadRouter.post('/image',
  upload.single('file'),
  wrapRequestHandler(uploadController.uploadImage)
)

/**
 * @route   POST /api/upload/images
 * @desc    Upload nhiều ảnh (tối đa 10)
 * @access  Private - Yêu cầu đăng nhập
 * @body    multipart/form-data: { files: File[], folder?: string }
 * @returns Array<{ url, publicId, width, height, format }>
 */
uploadRouter.post('/images',
  upload.array('files', 10),
  wrapRequestHandler(uploadController.uploadMultipleImages)
)

/**
 * @route   DELETE /api/upload/image
 * @desc    Xóa ảnh trên Cloudinary
 * @access  Private - Yêu cầu đăng nhập
 * @body    { publicId: string }
 */
uploadRouter.delete('/image',
  wrapRequestHandler(uploadController.deleteImage)
)

export default uploadRouter
