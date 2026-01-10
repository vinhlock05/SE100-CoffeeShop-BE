# Staff Management API Documentation

## Overview
API cho quản lý nhân sự: Staff, Shifts, Schedule, Timekeeping, Payroll.

## Authentication
Tất cả API yêu cầu Bearer Token trong header:
```
Authorization: Bearer <accessToken>
```

---

## 1. Staff (Nhân viên)

### POST /api/staff - Tạo nhân viên
**Permission:** `staff:create`

```json
{
  "fullName": "Nguyễn Văn A",
  "phone": "0901234567",
  "position": "Phục vụ",
  "salaryType": "hourly",   // "hourly" | "monthly"
  "baseRate": 50000,
  "username": "nva",        // Optional - tạo tài khoản
  "password": "123456",     // Optional
  "roleId": 1              // Optional
}
```
> **Note:** Mã nhân viên (NV001, NV002...) được tự động sinh.

### GET /api/staff - Danh sách nhân viên
**Permission:** `staff:view`
**Query:** `?search=&status=active&position=&page=1&limit=10`

### GET /api/staff/:id - Chi tiết nhân viên
### PATCH /api/staff/:id - Cập nhật nhân viên
### DELETE /api/staff/:id - Xóa nhân viên

---

## 2. Shifts (Ca làm việc)

### POST /api/shifts - Tạo ca
```json
{
  "name": "Ca sáng",
  "startTime": "07:00",
  "endTime": "11:00",
  "checkInTime": "06:30",   // Giờ bắt đầu chấm công
  "checkOutTime": "11:30"   // Giờ kết thúc chấm công
}
```

### GET /api/shifts - Danh sách ca
### GET /api/shifts/:id - Chi tiết ca
### PATCH /api/shifts/:id - Cập nhật ca
### PATCH /api/shifts/:id/toggle - Bật/tắt ca
### DELETE /api/shifts/:id - Xóa ca

---

## 3. Schedule (Xếp lịch)

### POST /api/schedules - Xếp 1 lịch
**Permission:** `staff_scheduling:update`
```json
{
  "staffId": 1,
  "shiftIds": [1, 2],
  "workDate": "2026-01-15",
  "notes": "Ghi chú"
}
```

### POST /api/schedules/bulk - Xếp nhiều lịch
```json
{
  "schedules": [
    { "staffId": 1, "shiftIds": [1, 2], "workDate": "2026-01-15" },
    { "staffId": 1, "shiftIds": [1, 2], "workDate": "2026-01-16" }
  ]
}
```

### POST /api/schedules/swap - Đổi ca
```json
{
  "from": { "staffId": 1, "shiftIds": [1, 2], "workDate": "2026-01-15" },
  "to": { "staffId": 2, "shiftIds": [1, 2], "workDate": "2026-01-15" }
}
```

### GET /api/schedules - Danh sách lịch
**Query:** `?from=2026-01-01&to=2026-01-31&staffId=&shiftId=`

### DELETE /api/schedules/:id - Xóa lịch

---

## 4. Timekeeping (Chấm công)

### POST /api/timekeeping/check-in - Chấm công vào
**Permission:** `staff_timekeeping:update`
**Header:** `X-Forwarded-For: <allowed_ip>`
```json
{
  "shiftId": 1,
  "note": "Ghi chú"
}
```

### POST /api/timekeeping/check-out - Chấm công ra
```json
{
  "note": "Ghi chú"
}
```

### POST /api/timekeeping/bulk - Chấm công hàng loạt (Admin)
```json
{
  "date": "2026-01-15",
  "shiftId": 1,
  "checkIn": "07:00",
  "checkOut": "11:00",
  "staffIds": [1, 2, 3]
}
```

### GET /api/timekeeping - Danh sách chấm công (Admin)
**Permission:** `staff_timekeeping:view`
**Query:** `?from=&to=&staffId=&shiftId=`

### PATCH /api/timekeeping/:id - Cập nhật chấm công (Admin)
```json
{
  "checkIn": "07:15",
  "checkOut": "11:00",
  "status": "late",
  "notes": "Điều chỉnh"
}
```

---

## 5. Payroll (Bảng lương)

### POST /api/payrolls - Tạo bảng lương tháng
**Permission:** `staff_payroll:create`
```json
{
  "month": 1,
  "year": 2026
}
```
> Tự động scan tất cả nhân viên active, tính lương dựa trên timekeeping.

### GET /api/payrolls - Danh sách bảng lương
**Query:** `?month=1&year=2026`

### GET /api/payrolls/:id - Chi tiết phiếu lương

### PATCH /api/payrolls/:id/payslips/:staffId - Cập nhật phiếu lương
```json
{
  "bonus": 500000,
  "penalty": 100000,
  "notes": "Thưởng/phạt"
}
```

### POST /api/payrolls/:id/payment - Thanh toán lương
```json
{
  "staffId": 1,
  "amount": 5000000,
  "method": "transfer",   // "cash" | "transfer"
  "bankName": "Vietcombank",
  "bankAccount": "123456789",
  "note": "Thanh toán T1/2026"
}
```

### PATCH /api/payrolls/:id/finalize - Chốt bảng lương

---

## Database Migration

Sau khi kéo code mới, chạy migration để cập nhật schema:

```bash
# Push schema changes
npx prisma db push

# Hoặc tạo migration
npx prisma migrate dev --name add_payroll_payment
```

**Schema mới:**
- `PayrollPayment` - Lưu lịch sử thanh toán lương
- `Payslip.bonus` - Tiền thưởng
- `Payslip.penalty` - Tiền phạt
