# Module Quản Lý Vai Trò (Role Management)

## Tổng quan

Module này cho phép Admin quản lý các vai trò (roles) và phân quyền. Tương ứng với trang **Phân quyền & Vai trò** trên FE.

## Quyền yêu cầu

- `system_users:view` - Xem danh sách roles và permissions
- `system_users:create` - Tạo role mới
- `system_users:update` - Cập nhật role  
- `system_users:delete` - Xóa role

---

## Endpoints

### 1. Lấy danh sách Roles

```
GET /api/roles
Authorization: Bearer <accessToken>
```

**Response:**
```json
{
  "message": "Get roles successfully",
  "metaData": {
    "roles": [
      {
        "id": 1,
        "name": "Quản lý",
        "description": "Toàn quyền quản lý hệ thống",
        "isSystem": true,
        "permissions": ["system_users:view", "system_users:create", ...],
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

---

### 2. Lấy danh sách Permissions

```
GET /api/roles/permissions
Authorization: Bearer <accessToken>
```

**Response:**
```json
{
  "message": "Get permissions successfully",
  "metaData": {
    "permissions": [
      { "id": "system_users:view", "name": "Xem danh sách", "category": "system" },
      { "id": "dashboard:view", "name": "Xem", "category": "dashboard" }
    ]
  }
}
```

---

### 3. Chi tiết Role

```
GET /api/roles/:id
Authorization: Bearer <accessToken>
```

---

### 4. Tạo Role

```
POST /api/roles
Authorization: Bearer <accessToken>
```

**Request Body:**
```json
{
  "name": "Quản lý kho",
  "description": "Nhân viên quản lý kho hàng",
  "permissions": [
    "goods_inventory:view",
    "goods_inventory:create",
    "goods_inventory:update"
  ]
}
```

---

### 5. Cập nhật Role

```
PATCH /api/roles/:id
Authorization: Bearer <accessToken>
```

**Request Body:**
```json
{
  "name": "Quản lý kho (Cập nhật)",
  "permissions": [
    "goods_inventory:view",
    "goods_inventory:create",
    "goods_inventory:update",
    "goods_inventory:delete"
  ]
}
```

---

### 6. Xóa Role

```
DELETE /api/roles/:id
Authorization: Bearer <accessToken>
```

---

## Roles mặc định (isSystem: true)

| Name | Description |
|------|-------------|
| Quản lý | Toàn quyền quản lý hệ thống |
| Thu ngân | Nhân viên thu ngân |
| Phục vụ | Nhân viên phục vụ |
| Pha chế | Nhân viên pha chế |

**Lưu ý:** Không thể xóa role hệ thống (isSystem: true)

---

## Error Responses

| Code | Message |
|------|---------|
| 400 | Role name already exists |
| 400 | Invalid permission IDs |
| 400 | Cannot delete system role |
| 400 | Cannot delete role. X user(s) are using this role |
| 403 | Permission denied |
| 404 | Role not found |
