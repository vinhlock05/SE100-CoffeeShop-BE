# Upload Image API Documentation

## Tổng quan

API upload ảnh lên Cloudinary để sử dụng cho `imageUrl` của sản phẩm, nhân viên, v.v.

## Base URL
```
http://localhost:4000/api/upload
```

## Authentication
Tất cả API đều yêu cầu đăng nhập:
```
Authorization: Bearer <access_token>
```

---

## API Endpoints

### 1. Upload 1 ảnh

```http
POST /upload/image
Content-Type: multipart/form-data
```

**Request:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| file | File | ✅ | File ảnh (JPEG, PNG, WebP, GIF) |
| folder | string | ❌ | Folder trên cloud (default: "products") |

**Response:**
```json
{
  "message": "Upload ảnh thành công",
  "metaData": {
    "url": "https://res.cloudinary.com/.../image.jpg",
    "publicId": "coffeeshop/products/abc123",
    "width": 800,
    "height": 600,
    "format": "jpg"
  }
}
```

### 2. Upload nhiều ảnh

```http
POST /upload/images
Content-Type: multipart/form-data
```

**Request:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| files | File[] | ✅ | Tối đa 10 files |
| folder | string | ❌ | Folder trên cloud |

### 3. Xóa ảnh

```http
DELETE /upload/image
Content-Type: application/json
```

**Request:**
```json
{
  "publicId": "coffeeshop/products/abc123"
}
```

---

## Hướng dẫn cho Frontend

### Flow upload ảnh khi tạo/sửa sản phẩm

```
1. User chọn ảnh → Preview LOCAL (không upload)
2. User nhập thông tin sản phẩm
3. User nhấn "Tạo/Lưu"
4. FE gọi API upload ảnh → Nhận URL
5. FE gọi API tạo/sửa sản phẩm với imageUrl
```

### Code mẫu React/TypeScript

```tsx
// 1. State để lưu file và preview
const [selectedFile, setSelectedFile] = useState<File | null>(null)
const [previewUrl, setPreviewUrl] = useState<string | null>(null)

// 2. Xử lý khi chọn ảnh - CHỈ PREVIEW, KHÔNG UPLOAD
const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0]
  if (file) {
    // Validate file
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      alert('Chỉ hỗ trợ file JPEG, PNG, WebP')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('File quá lớn. Tối đa 5MB')
      return
    }
    
    // Lưu file và tạo preview URL
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }
}

// 3. Hàm upload ảnh lên cloud
const uploadImage = async (file: File): Promise<string | null> => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('folder', 'products')
  
  try {
    const response = await fetch('http://localhost:4000/api/upload/image', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`
        // KHÔNG set Content-Type, browser tự set với boundary
      },
      body: formData
    })
    
    const data = await response.json()
    return data.metaData.url
  } catch (error) {
    console.error('Upload failed:', error)
    return null
  }
}

// 4. Khi submit form - UPLOAD RỒI MỚI TẠO SẢN PHẨM
const handleSubmit = async () => {
  let imageUrl = ''
  
  // Upload ảnh nếu có chọn
  if (selectedFile) {
    const uploadedUrl = await uploadImage(selectedFile)
    if (!uploadedUrl) {
      alert('Upload ảnh thất bại')
      return
    }
    imageUrl = uploadedUrl
  }
  
  // Gọi API tạo sản phẩm
  await createProduct({
    name: productName,
    categoryId: selectedCategory,
    imageUrl: imageUrl,
    // ... other fields
  })
}

// 5. Cleanup preview URL khi unmount
useEffect(() => {
  return () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
  }
}, [previewUrl])
```

### Component Input Upload

```tsx
<div className="upload-container">
  <input
    type="file"
    accept="image/jpeg,image/png,image/webp"
    onChange={handleFileSelect}
    id="image-upload"
    hidden
  />
  
  <label htmlFor="image-upload" className="upload-label">
    {previewUrl ? (
      <img src={previewUrl} alt="Preview" className="preview-image" />
    ) : (
      <div className="upload-placeholder">
        <span>📷 Chọn ảnh</span>
        <small>JPEG, PNG, WebP (max 5MB)</small>
      </div>
    )}
  </label>
  
  {previewUrl && (
    <button onClick={() => {
      setSelectedFile(null)
      setPreviewUrl(null)
    }}>
      Xóa ảnh
    </button>
  )}
</div>
```

---

## Lưu ý quan trọng

1. **KHÔNG upload ngay khi chọn ảnh** - Chỉ preview local, upload khi submit form
2. **Validate file trước khi upload** - Check type và size ở FE
3. **KHÔNG set Content-Type header** khi gửi FormData - Browser tự set
4. **Cleanup preview URL** - Tránh memory leak bằng `URL.revokeObjectURL`
5. **Xử lý lỗi upload** - Hiển thị thông báo cho user nếu upload fail

---

## Giới hạn

| Giới hạn | Giá trị |
|----------|---------|
| File size tối đa | 5MB |
| Định dạng hỗ trợ | JPEG, PNG, WebP, GIF |
| Số file upload 1 lần | 10 |
| Kích thước sau resize | max 800x800 |

---

## Cấu hình Cloudinary (Backend)

Backend team cần thiết lập trong file `.env`:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Đăng ký tài khoản miễn phí tại: https://cloudinary.com
