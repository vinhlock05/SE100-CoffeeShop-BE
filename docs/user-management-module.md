# Module Quản Lý Người Dùng (User Management)

## Tổng quan

Module này cho phép Admin quản lý tài khoản người dùng (users). 

**Lưu ý:** User là entity xác thực (authentication), khác với Staff là entity nhân viên (business).

## Quyền yêu cầu

- `system_users:view` - Xem danh sách users
- `system_users:create` - Tạo user mới  
- `system_users:update` - Cập nhật user
- `system_users:delete` - Xóa user

---

## Endpoints

### 1. Lấy danh sách Users

```
GET /api/users?page=1&limit=10&search=admin&status=active&roleId=1
Authorization: Bearer <accessToken>
```

**Query Parameters:**
- `page` - Trang (mặc định: 1)
- `limit` - Số lượng/trang (mặc định: 10)
- `search` - Tìm theo username hoặc fullName
- `status` - Filter theo status (active, inactive, suspended)
- `roleId` - Filter theo role

**Response:**
```json
{
  "message": "Get users successfully",
  "metaData": {
    "users": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 4,
      "totalPages": 1
    }
  }
}
```

---

### 2. Chi tiết User

```
GET /api/users/:id
Authorization: Bearer <accessToken>
```

---

### 3. Tạo User

```
POST /api/users
Authorization: Bearer <accessToken>
```

**Request Body:**
```json
{
  "username": "newuser",
  "password": "123456",
  "roleId": 2
}
```

**Lưu ý:** `fullName` được lấy từ Staff khi link User với Staff.

---

### 4. Cập nhật User

```
PATCH /api/users/:id
Authorization: Bearer <accessToken>
```

**Request Body:**
```json
{
  "roleId": 3,
  "status": "inactive",
  "newPassword": "newpassword123"
}
```

---

### 5. Xóa User (Soft Delete)

```
DELETE /api/users/:id
Authorization: Bearer <accessToken>
```

---

### 6. Khôi phục User

```
POST /api/users/:id/restore
Authorization: Bearer <accessToken>
```

---

## User Status

| Value | Mô tả |
|-------|-------|
| `active` | Đang hoạt động |
| `inactive` | Tạm ngưng |
| `suspended` | Bị khóa |
| `deleted` | Đã xóa (soft delete) |

---

## Error Responses

| Code | Message |
|------|---------|
| 400 | Username already exists |
| 400 | Role not found |
| 403 | Permission denied |
| 404 | User not found |
