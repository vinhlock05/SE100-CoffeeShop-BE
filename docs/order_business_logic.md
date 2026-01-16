# Order Module - Business Logic

## I. Tổng Quan

Module Order quản lý toàn bộ quy trình đặt món và thanh toán:

```
Tạo Order → Thêm món → Gửi bếp → Thanh toán → Hoàn thành
     ↓          ↓          ↓          ↓
  [PENDING]  [PENDING]  [IN_PROGRESS] [COMPLETED]
```

---

## II. Trạng Thái Order

### Order Status
| Status | Mô tả |
|--------|-------|
| `pending` | Mới tạo, chưa gửi bếp |
| `in_progress` | Đã gửi bếp, đang làm |
| `completed` | Đã thanh toán |
| `cancelled` | Đã hủy |

### Payment Status
| Status | Mô tả |
|--------|-------|
| `unpaid` | Chưa thanh toán |
| `paid` | Đã thanh toán |

### Order Item Status
| Status | Mô tả |
|--------|-------|
| `pending` | Chờ gửi bếp |
| `preparing` | Đang làm |
| `completed` | Làm xong |
| `served` | Đã phục vụ khách |
| `cancelled` | Đã hủy |

---

## III. Tạo Order

### API
```
POST /api/orders
```

### Request Body
```json
{
  "tableId": 1,           // Optional - null nếu takeaway
  "customerId": 1,        // Optional - null cho khách vãng lai
  "orderType": "dine-in", // Optional - "dine-in" | "takeaway"
  "notes": "Ghi chú",
  "items": [
    {
      "itemId": 10,
      "quantity": 2,
      "notes": "Ít đường",
      "attachedToppings": [
        { "itemId": 20, "quantity": 1 }
      ]
    },
    {
      "itemId": 5,
      "comboId": 1,        // Món thuộc combo
      "quantity": 1
    }
  ]
}
```

### Logic xử lý

```typescript
// 1. Validate bàn (nếu có)
if (tableId && table.status === 'occupied') → Error

// 2. Xử lý từng món
for (item in items) {
  // 2a. Lấy giá gốc từ DB
  unitPrice = dbItem.sellingPrice
  
  // 2b. Nếu là combo → tính giá pro-rate
  if (item.comboId) {
    unitPrice = calculateProRatedPrice(item, combo)
  }
  
  // 2c. Xử lý toppings
  if (item.attachedToppings) {
    // Tạo OrderItem cho từng topping với parentItemId
  }
}

// 3. Tạo Order + OrderItems trong transaction
// 4. Cập nhật trạng thái bàn → OCCUPIED
```

---

## IV. Combo Logic

### Cấu trúc Combo

```
Combo "Cà phê + Bánh" (comboPrice: 50,000đ)
├── ComboGroup "Chọn đồ uống" (minChoices: 1, maxChoices: 1, isRequired: true)
│   ├── ComboItem: Cà phê đen (extraPrice: 0)
│   ├── ComboItem: Cà phê sữa (extraPrice: 5,000đ)
│   └── ComboItem: Trà lài (extraPrice: 0)
└── ComboGroup "Chọn bánh" (minChoices: 1, maxChoices: 1, isRequired: true)
    ├── ComboItem: Bánh mì
    └── ComboItem: Croissant
```

### Công thức tính giá Pro-rate

**Mục đích:** Chia nhỏ giá combo cho từng món để:
- Báo cáo doanh thu chính xác theo món
- Xử lý khi hủy 1 món trong combo
- Áp dụng promotion đúng

**Công thức:**
```typescript
// Bước 1: Tính tổng giá gốc của các món được chọn
actualItemsTotal = SUM(selectedItems.sellingPrice * quantity)

// Bước 2: Tính giá pro-rate cho từng món
proRatedPrice = (item.sellingPrice / actualItemsTotal) * combo.comboPrice

// Bước 3: Cộng thêm extraPrice nếu có
finalPrice = proRatedPrice + comboItemRules.extraPrice
```

**Ví dụ:**
```
Combo: 50,000đ
Khách chọn:
  - Cà phê sữa: 35,000đ + extraPrice 5,000đ
  - Bánh mì: 25,000đ
  
actualTotal = 35,000 + 25,000 = 60,000đ

Pro-rate:
  - Cà phê sữa: (35,000 / 60,000) × 50,000 = 29,167đ + 5,000đ = 34,167đ
  - Bánh mì: (25,000 / 60,000) × 50,000 = 20,833đ
  
Tổng đơn: 34,167 + 20,833 = 55,000đ ✅
```

### Gửi món combo từ FE

```json
// FE gửi TỪNG MÓN được chọn trong combo
{
  "items": [
    { "itemId": 1, "comboId": 1, "quantity": 1 },  // Món thứ 1
    { "itemId": 5, "comboId": 1, "quantity": 1 }   // Món thứ 2
  ]
}
```

**Backend validate:**
- Món có thuộc combo groups không?
- extraPrice của món đó là bao nhiêu?

---

## V. Topping Logic

### Cách gửi
```json
{
  "itemId": 5,         // Trà sữa
  "quantity": 1,
  "attachedToppings": [
    { "itemId": 10, "quantity": 1 },  // Trân châu
    { "itemId": 11, "quantity": 2 }   // Thạch
  ]
}
```

### Cách lưu trong DB
```
OrderItem #1: Trà sữa (isTopping: false)
OrderItem #2: Trân châu (isTopping: true, parentItemId: 1)
OrderItem #3: Thạch (isTopping: true, parentItemId: 1)
```

### Lấy toppings khi query
```typescript
orderItems: {
  include: {
    toppings: true  // Tự động lấy các item có parentItemId = this.id
  }
}
```

---

## VI. Link Customer

### Tạo order với customer ngay từ đầu
```json
POST /api/orders
{
  "customerId": 5,
  "items": [...]
}
```

### Link customer sau khi tạo order
```json
PATCH /api/orders/:id
{
  "customerId": 5
}
```

**Use case:** Khách vãng lai gọi món → lúc thanh toán muốn tích điểm → tạo tài khoản → PATCH customerId vào order

---

## VII. Khuyến Mãi (Promotion)

### Flow áp dụng
```
1. FE: GET /promotions/available { orderId, customerId }
   → Danh sách KM có thể dùng

2. FE: POST /promotions/apply { promotionId, orderId }
   → Tính discountAmount

3. FE: GET /orders/:id
   → Lấy totalAmount đã giảm
```

### Hủy khuyến mãi
```
POST /promotions/unapply { promotionId, orderId }
```

**Lưu ý:** Khi hủy order có áp dụng KM, backend tự động gọi unapply.

---

## VIII. Checkout (Thanh toán)

### API
```
POST /api/orders/:id/checkout
{
  "paymentMethod": "cash",  // "cash" | "transfer"
  "paidAmount": 200000
}
```

### Logic
```typescript
// 1. Validate
if (paidAmount < totalAmount) → Error("Không đủ tiền")

// 2. Cập nhật order
order.paymentStatus = 'paid'
order.status = 'completed'
order.completedAt = now()

// 3. Giải phóng bàn
if (order.tableId) {
  table.status = 'available'
}

// 4. Cập nhật customer stats (nếu có)
if (order.customerId) {
  customer.totalOrders += 1
  customer.totalSpent += order.totalAmount
  
  // Auto nâng/hạ tier
  customerService.assignCustomerGroup(customerId)
}

// 5. TODO: Tạo finance transaction
```

---

## IX. Hủy Order

### API
```
POST /api/orders/:id/cancel
{
  "reason": "Khách đổi ý"
}
```

### Logic
```typescript
// 1. Validate
if (order.status === 'completed') → Error("Không thể hủy")

// 2. Hủy promotion (nếu có)
if (order.promotionId) {
  promotionService.unapplyPromotion(promotionId, orderId)
}

// 3. Cập nhật order
order.status = 'cancelled'
order.promotionId = null
order.discountAmount = 0

// 4. Giải phóng bàn
if (order.tableId) {
  table.status = 'available'
}
```

---

## X. In Bill (comboSummary)

Response `GET /orders/:id` có trường `comboSummary` để FE in bill đẹp:

### Response mẫu
```json
{
  "id": 1,
  "orderCode": "HD001",
  "totalAmount": 55000,
  "orderItems": [
    { "id": 1, "name": "Cà phê sữa", "comboId": 1, "totalPrice": 34167 },
    { "id": 2, "name": "Bánh mì", "comboId": 1, "totalPrice": 20833 }
  ],
  "comboSummary": [
    {
      "comboId": 1,
      "comboName": "Combo Cà phê + Bánh",
      "comboPrice": 50000,
      "actualTotal": 55000,
      "items": [
        { "id": 1, "name": "Cà phê sữa", "quantity": 1 },
        { "id": 2, "name": "Bánh mì", "quantity": 1 }
      ]
    }
  ]
}
```

### FE in bill
```
Combo Cà phê + Bánh        55.000
  - Cà phê sữa (size L)
  - Bánh mì
---------------------------------
Tổng tiền                  55.000
```

---

## XI. API Endpoints

### Order CRUD
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/orders` | Danh sách orders |
| `GET` | `/orders/:id` | Chi tiết order |
| `POST` | `/orders` | Tạo order |
| `PATCH` | `/orders/:id` | Cập nhật (customerId, notes...) |

### Order Items
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `POST` | `/orders/:id/items` | Thêm món |
| `PATCH` | `/orders/:id/items/:itemId` | Sửa món |
| `DELETE` | `/orders/:id/items/:itemId` | Xóa món |

### Order Actions
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `POST` | `/orders/:id/send-to-kitchen` | Gửi bếp |
| `POST` | `/orders/:id/checkout` | Thanh toán |
| `POST` | `/orders/:id/cancel` | Hủy order |

### Kitchen
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/orders/kitchen/items` | Danh sách món cần làm |
| `PATCH` | `/orders/items/:id/status` | Cập nhật trạng thái món |

---

## XII. Edge Cases

### 1. Combo có món bị xóa khỏi menu
- Order cũ vẫn giữ nguyên (đã lưu name, price)
- Order mới: validate fail → Error

### 2. Giá món thay đổi sau khi tạo order
- Không ảnh hưởng order đã tạo
- Order mới lấy giá mới

### 3. Khách vãng lai áp dụng KM member-only
- Promotion check `applyToWalkIn` flag
- Nếu false → Block

### 4. Hủy order đã thanh toán
- Không cho phép qua API cancel
- Cần admin tạo refund transaction (TODO)

---

## XIII. Files liên quan

| File | Mô tả |
|------|-------|
| `src/services/order.service.ts` | Business logic chính |
| `src/controllers/order.controller.ts` | HTTP handlers |
| `src/routes/order.route.ts` | Route definitions |
| `src/dtos/order/*.ts` | Request validation |
| `src/enums/order.enum.ts` | Status enums |
