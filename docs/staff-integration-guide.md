# Hướng dẫn Tích hợp Module Quản Lý Nhân Viên (Frontend)

Backend đã hỗ trợ API `/api/staff` cho phép quản lý toàn diện nhân viên bao gồm:
1. **Thông tin cá nhân** (Họ tên, ngày sinh, CCCD...)
2. **Thông tin lương** (Lương cơ bản, phụ cấp...)
3. **Tài khoản hệ thống** (Username, password, phân quyền...)

## 1. Data Models

### Staff Entity (Response)
```json
{
  "id": 1,
  "code": "NV001",
  "fullName": "Nguyễn Văn A",
  "position": "Nhân viên phục vụ",
  // ... thông tin khác
  "user": { // Thông tin tài khoản (nếu có)
    "id": 10,
    "username": "nguyenvana",
    "role": { "id": 1, "name": "Thu ngân" },
    "status": "active"
  },
  "currentSalary": { // Mức lương hiện tại (nếu có)
    "salaryType": "hourly",
    "baseRate": "25000",
    "effectiveFrom": "2024-01-01"
  }
}
```

## 2. Quy trình "Thêm Nhân Viên" (Create Flow)

Frontend nên thiết kế Form thêm mới dạng **Steps** hoặc **Tabs**, gộp chung vào **1 API Call duy nhất** để đảm bảo tính toàn vẹn dữ liệu.

### Gợi ý giao diện:
- **Phần 1: Thông tin cơ bản**
  - Mã NV (`code` - required)
  - Họ tên (`fullName` - required)
  - SĐT, Email, CCCD...
- **Phần 2: Thiết lập lương (Đơn giản hóa)**
  - Backend hiện tại hỗ trợ mô hình lương gọn nhẹ để dễ tính toán chấm công:
  - **Loại lương (`salaryType`)**:
    - `hourly`: Lương theo giờ (Ví dụ: Part-time).
    - `monthly`: Lương cố định theo tháng (Ví dụ: Full-time).
  - **Mức lương (`baseRate`)**: Nhập số tiền (VNĐ).
  - *Lưu ý: Các cấu hình phức tạp như hệ số lương ngày lễ, ca kíp... tạm thời bỏ qua để giảm độ phức tạp cho hệ thống.*
- **Phần 3: Tài khoản hệ thống** (Optional)
  - Checkbox ☑️ "Tạo tài khoản đăng nhập hệ thống"
  - Nếu tick -> Hiện field `username`, `password`, `roleId` (dropdown Roles).

### API Request:
```typescript
// POST /api/staff
const payload = {
  // 1. Basic Info
  code: "NV001",
  fullName: "Nguyễn Văn A",
  phone: "0909...",
  // ...
  
  // 2. Salary Info (Optional)
  salaryType: "hourly",
  baseRate: 25000,
  
  // 3. Account Info (Optional)
  username: "user1",
  password: "password123",
  roleId: 2
}
```

## 3. Quy trình "Cập nhật Nhân Viên" (Update Flow)

Khi vào chi tiết nhân viên, Frontend load dữ liệu từ `GET /api/staff/:id`. Dữ liệu trả về sẽ bao gồm cả `user` và `currentSalary` mới nhất.

### Xử lý logic:

**Tab Thông tin chung:**
- Gọi `PATCH /api/staff/:id` với body chỉ chứa các trường thông tin thay đổi (fullName, phone...).

**Tab Lương:**
- Hiển thị lịch sử lương (nếu cần lấy list thì cần thêm API history, hiện tại API detail trả về list `salarySettings`).
- Form "Điều chỉnh lương mới":
  - Nhập mức lương mới, ngày hiệu lực.
  - Gọi `PATCH /api/staff/:id` với:
    ```json
    {
      "newSalaryType": "monthly",
      "newBaseRate": 8000000,
      "salaryEffectiveDate": "2024-02-01"
    }
    ```
  - Backend sẽ tự động tạo bản ghi lương mới (giữ lại lịch sử cũ).

**Tab Tài khoản:**
- **Thống nhất logic**: Frontend chỉ cần gửi thông tin tài khoản (username, password, roleId) vào API Update Staff. Backend sẽ tự động xử lý:
  - Nếu Staff **chưa có tài khoản**: Tự động tạo user mới và link vào.
  - Nếu Staff **đã có tài khoản**:
    - Update `username` (nếu thay đổi).
    - Update `roleId` (nếu thay đổi).
    - Update `password` (chỉ gửi field này nếu user muốn reset password).
  - Tự động đồng bộ trạng thái: Nếu Staff set `status: 'inactive'`, tài khoản User cũng sẽ bị inactive.

### Payload Model (Update):
`PATCH /api/staff/:id`
```json
{
  "fullName": "New Name",
  // Account Info (Optional - Gửi nếu muốn update/create)
  "username": "new_username",
  "roleId": 3,
  "password": "newpassword123", // Chỉ gửi nếu muốn đổi pass
  
  // Salary Info (Optional)
  "newSalaryType": "monthly",
  "newBaseRate": 9000000
}
```

## 4. Tóm tắt integration
- Mọi thao tác quản lý nhân viên (Thông tin, Lương, Tài khoản) đều qua **Staff API**.
- User Management API (`/api/users`) chỉ dùng cho Admin hệ thống khi cần can thiệp sâu (khóa khẩn cấp, debug), không dùng cho luồng nghiệp vụ nhân sự thông thường.
