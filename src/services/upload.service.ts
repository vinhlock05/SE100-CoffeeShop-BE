import cloudinary from '~/config/cloudinary'
import { BadRequestError } from '~/core/error.response'
import streamifier from 'streamifier'

interface UploadResult {
  url: string
  publicId: string
  width: number
  height: number
  format: string
}

class UploadService {
  /**
   * Upload ảnh lên Cloudinary
   * @param file - File buffer từ multer
   * @param folder - Folder trên Cloudinary (vd: 'products', 'staff')
   */
  async uploadImage(file: Express.Multer.File, folder: string = 'products'): Promise<UploadResult> {
    if (!file) {
      throw new BadRequestError({ message: 'Không có file được tải lên' })
    }

    // Validate file type
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestError({ message: 'Chỉ hỗ trợ file ảnh (JPEG, PNG, WebP, GIF)' })
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      throw new BadRequestError({ message: 'File quá lớn. Tối đa 5MB' })
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `coffeeshop/${folder}`,
          resource_type: 'image',
          transformation: [
            { width: 800, height: 800, crop: 'limit' }, // Resize max 800x800
            { quality: 'auto' }, // Auto optimize quality
            { fetch_format: 'auto' } // Auto format (webp for browsers that support)
          ]
        },
        (error: Error | undefined, result: any) => {
          if (error) {
            reject(new BadRequestError({ message: `Upload thất bại: ${error.message}` }))
          } else if (result) {
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
              width: result.width,
              height: result.height,
              format: result.format
            })
          }
        }
      )

      // Pipe buffer to upload stream
      streamifier.createReadStream(file.buffer).pipe(uploadStream)
    })
  }

  /**
   * Upload nhiều ảnh
   */
  async uploadMultipleImages(files: Express.Multer.File[], folder: string = 'products'): Promise<UploadResult[]> {
    if (!files || files.length === 0) {
      throw new BadRequestError({ message: 'Không có file được tải lên' })
    }

    const uploadPromises = files.map(file => this.uploadImage(file, folder))
    return Promise.all(uploadPromises)
  }

  /**
   * Xóa ảnh trên Cloudinary
   */
  async deleteImage(publicId: string): Promise<{ success: boolean }> {
    try {
      await cloudinary.uploader.destroy(publicId)
      return { success: true }
    } catch (error) {
      throw new BadRequestError({ message: 'Xóa ảnh thất bại' })
    }
  }
}

export const uploadService = new UploadService()
