# Module Xác Thực (Authentication)

## Tổng quan

Module xác thực cung cấp các API để đăng nhập, đăng xuất, làm mới token và lấy thông tin profile.

---

## Endpoints

### 1. Đăng nhập

```
POST /api/auth/login
```

**Request Body:**
```json
{
  "username": "admin",
  "password": "123456"
}
```

**Response (200):**
```json
{
  "message": "Login successfully",
  "statusCode": 200,
  "metaData": {
    "user": {
      "id": 1,
      "username": "admin",
      "fullName": "Nguyễn Văn A",
      "roleId": 1,
      "status": "active",
      "role": {
        "id": 1,
        "name": "Quản lý",
        "description": "Toàn quyền quản lý hệ thống"
      },
      "permissions": ["system_users:view", "system_users:create", ...]
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

---

### 2. Đăng xuất

```
POST /api/auth/logout
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "message": "Logged out successfully",
  "statusCode": 200
}
```

---

### 3. Làm mới Token

```
POST /api/auth/refresh-token
```

**Request Body hoặc Cookie:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200):**
```json
{
  "message": "Token refreshed successfully",
  "statusCode": 200,
  "metaData": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

---

### 4. Lấy Profile

```
GET /api/auth/me
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "message": "Get profile successfully",
  "statusCode": 200,
  "metaData": {
    "id": 1,
    "username": "admin",
    "passwordHash": "...",
    "fullName": "Nguyễn Văn A", // Từ Staff
    "status": "active",
    "staff": {
       "id": 1,
       "code": "NV001",
       "fullName": "Nguyễn Văn A",
       "phone": "0901234567"
       // ...
    },
    "role": {
      "id": 1,
      "name": "Quản lý",
      "description": "Toàn quyền"
    },
    "permissions": [
      { "id": "system_users:view", "name": "Xem danh sách", "category": "system" }
    ]
  }
}
```

---

### 5. Đổi tên đăng nhập

```
POST /api/auth/change-username
Authorization: Bearer <accessToken>
```

**Request Body:**
```json
{
  "username": "newadmin"
}
```

---

### 6. Đổi mật khẩu

```
POST /api/auth/change-password
Authorization: Bearer <accessToken>
```

**Request Body:**
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword"
}
```

---

## Tài khoản mặc định

| Username | Password | Role |
|----------|----------|------|
| admin | 123456 | Quản lý |
| thungan | 123456 | Thu ngân |
| phucvu | 123456 | Phục vụ |
| phache | 123456 | Pha chế |

---

## Error Responses

| Code | Message |
|------|---------|
| 400 | Invalid username or password |
| 400 | Account is not active |
| 400 | Account has been deleted |
| 401 | Access token is required |
| 401 | Access token has expired |
| 401 | Invalid access token |
