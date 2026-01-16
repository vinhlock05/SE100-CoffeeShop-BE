# Inventory Management API Documentation

## Base URL
```
http://localhost:4000/api
```

## Authentication
Tất cả API đều yêu cầu Bearer Token:
```
Authorization: Bearer <access_token>
```

---

## 7. INVENTORY ITEMS API

### 7.1 Tạo sản phẩm/nguyên liệu
```http
POST /inventory-items
```
**Permission:** `goods_inventory:create`

**Request Body:**
```json
{
  "name": "Cà phê Arabica",
  "itemTypeId": 3,
  "categoryId": 1,
  "unitId": 1,
  "minStock": 10,
  "maxStock": 100,
  "sellingPrice": 50000,
  "productStatus": "selling",
  "isTopping": false,
  "imageUrl": "https://example.com/image.png"
}
```

### 7.2 Lấy danh sách sản phẩm
```http
GET /inventory-items
```
**Permission:** `goods_inventory:view`

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| search | string | Tìm theo tên |
| categoryId | number | ID danh mục |
| itemTypeId | number | ID loại hàng (1=ready_made, 2=composite, 3=ingredient) |
| stockStatus | string | Trạng thái kho: good,low,critical,expiring,expired (multi-select) |
| productStatus | string | Trạng thái bán: selling,hot,slow,paused (multi-select) |
| sortBy | name/currentStock/sellingPrice/createdAt | Sắp xếp |
| sortOrder | asc/desc | Thứ tự |
| page | number | Trang (default: 1) |
| limit | number | Số/trang (default: 10) |

**Filter Multi-Select Example:**
```
?stockStatus=good,low&productStatus=selling,hot
```

### 7.3-7.5 Chi tiết, Cập nhật, Xóa
```http
GET /inventory-items/:id
PATCH /inventory-items/:id
DELETE /inventory-items/:id
```

---

## 8. SUPPLIERS API

### 8.1 Tạo nhà cung cấp
```http
POST /suppliers
```
**Permission:** `suppliers:create`

**Request Body:**
```json
{
  "name": "Trung Nguyên",
  "contactPerson": "Nguyễn Văn A",
  "phone": "0281234567",
  "email": "contact@trungnguyen.com",
  "address": "123 Nguyễn Huệ",
  "city": "Hồ Chí Minh",
  "category": "Cà phê"
}
```

### 8.2 Lấy danh sách NCC
```http
GET /suppliers
```

**Response Fields:**
- `totalDebt`: Công nợ (dương = mình nợ NCC)
- `totalPurchaseAmount`: Tổng giá trị đã mua
- `purchaseOrderCount`: Số lượng phiếu nhập
- `recentOrders`: 10 phiếu nhập gần nhất

### 8.3-8.6 Chi tiết, Cập nhật, Toggle, Xóa
```http
GET /suppliers/:id
PATCH /suppliers/:id
PATCH /suppliers/:id/toggle-status
DELETE /suppliers/:id
```

### 8.7 Lấy danh mục NCC
```http
GET /suppliers/categories
```
**Response Body:**
```json
{
  "categories": ["Cà phê", "Sữa", "Trà"]
}
```

---

## 9. PURCHASE ORDERS API

### 9.1 Tạo phiếu nhập hàng
```http
POST /purchase-orders
```
**Permission:** `purchase_orders:create`

**Request Body:**
```json
{
  "supplierId": 1,
  "orderDate": "2026-01-10",
  "paidAmount": 5000000,
  "paymentMethod": "transfer",
  "bankName": "VCB",
  "bankAccount": "1234567890",
  "notes": "Nhập hàng đầu tháng",
  "items": [
    {
      "itemId": 1,
      "batchCode": "LO-2026-001",
      "quantity": 50,
      "unit": "kg",
      "unitPrice": 250000,
      "expiryDate": "2026-06-30"
    }
  ]
}
```

### 9.2-9.4 Danh sách, Chi tiết, Cập nhật
```http
GET /purchase-orders
GET /purchase-orders/:id
PATCH /purchase-orders/:id
```

### 9.5 Hoàn thành phiếu nhập
```http
PATCH /purchase-orders/:id/complete
```

> ⚠️ **Logic khi complete:**
> 1. Tạo `InventoryBatch` cho mỗi item
> 2. Cập nhật `InventoryItem`:
>    - `currentStock += quantity`
>    - `totalValue += quantity × unitPrice`
>    - `avgUnitCost = totalValue / currentStock`
> 3. Cập nhật `Supplier`:
>    - `totalPurchases += totalAmount`
>    - `totalDebt += debtAmount`
> 4. **Auto-update stockStatus** cho các items

### 9.6 Huỷ phiếu
```http
PATCH /purchase-orders/:id/cancel
```

---

## 10. WRITE-OFFS API (Xuất Huỷ)

### 10.1 Tạo phiếu xuất huỷ
```http
POST /write-offs
```
**Permission:** `write_offs:create`

**Request Body:**
```json
{
  "writeOffDate": "2026-01-10",
  "reason": "Hết hạn sử dụng",
  "notes": "Huỷ lô hàng hết hạn",
  "items": [
    {
      "itemId": 1,
      "batchId": 5,
      "quantity": 10,
      "unit": "chai",
      "unitCost": 12000,
      "reason": "Hết HSD"
    }
  ]
}
```

### 10.2-10.4 Danh sách, Chi tiết, Cập nhật
```http
GET /write-offs
GET /write-offs/:id
PATCH /write-offs/:id
```

### 10.5 Hoàn thành phiếu
```http
PATCH /write-offs/:id/complete
```

> ⚠️ **Logic:** Trừ kho, cập nhật avgUnitCost, auto-update stockStatus

### 10.6 Huỷ phiếu
```http
PATCH /write-offs/:id/cancel
```

---

## 11. STOCK CHECKS API (Kiểm Kê)

### 11.1 Tạo phiên kiểm kê
```http
POST /stock-checks
```
**Permission:** `goods_stock_check:create`

**Request Body:**
```json
{
  "checkDate": "2026-01-10",
  "notes": "Kiểm kê đầu tháng",
  "items": [
    {
      "itemId": 1,
      "actualQuantity": 45,
      "unit": "chai",
      "notes": "Thiếu 3 chai"
    }
  ]
}
```

### 11.2-11.4 Danh sách, Chi tiết, Cập nhật
```http
GET /stock-checks
GET /stock-checks/:id
PATCH /stock-checks/:id
```

### 11.5 Hoàn thành kiểm kê
```http
PATCH /stock-checks/:id/complete
```

> ⚠️ **Logic:** Cập nhật `currentStock = actualQuantity`, auto-update stockStatus

### 11.6 Huỷ phiên
```http
PATCH /stock-checks/:id/cancel
```

---

## 12. PRODUCT PRICING API

### 12.1 Lấy danh sách giá
```http
GET /pricing
```
**Permission:** `goods_pricing:view`

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| search | string | Tìm theo tên |
| categoryId | number | ID danh mục |
| itemTypeId | number | ID loại hàng |
| sortBy | name/costPrice/lastPurchasePrice/sellingPrice/margin | Sắp xếp |
| sortOrder | asc/desc | Thứ tự |
| page | number | Trang |
| limit | number | Số/trang |

**Response Fields:**
```json
{
  "items": [
    {
      "id": 1,
      "name": "Cà phê Arabica",
      "costPrice": 35000,          // Giá vốn bình quân (avgUnitCost)
      "lastPurchasePrice": 34000,  // Giá nhập cuối (từ batch gần nhất)
      "sellingPrice": 50000,       // Giá bán
      "margin": 30.0               // Lợi nhuận %
    }
  ]
}
```

### 12.2 Cập nhật giá 1 sản phẩm
```http
PATCH /pricing/single
```
**Permission:** `goods_pricing:update`

**Request Body:**
```json
{
  "itemId": 1,
  "baseType": "cost",          // current | cost | lastPurchase
  "adjustmentValue": 30,       // Cộng 30%
  "adjustmentType": "percent"  // amount (VNĐ) | percent (%)
}
```

**Công thức:** `newPrice = basePrice + adjustment`

### 12.3 Cập nhật giá theo danh mục
```http
PATCH /pricing/category
```
**Permission:** `goods_pricing:update`

**Request Body:**
```json
{
  "categoryId": 1,
  "baseType": "current",
  "adjustmentValue": 5000,
  "adjustmentType": "amount"
}
```

### 12.4 Batch update giá
```http
PATCH /pricing/batch
```
**Permission:** `goods_pricing:update`

**Request Body:**
```json
{
  "items": [
    { "id": 1, "sellingPrice": 50000 },
    { "id": 2, "sellingPrice": 45000 }
  ]
}
```

---

## Stock Status (Auto-Calculated)

| Status | Điều kiện |
|--------|-----------|
| `good` | Đủ hàng (currentStock >= minStock) |
| `low` | Sắp hết hàng (0 < currentStock < minStock) |
| `critical` | Hết hàng (currentStock = 0) |
| `expiring` | Có lô sắp hết hạn (HSD <= 30 ngày) |
| `expired` | Có lô đã hết hạn |

> **Priority:** expired > expiring > critical > low > good

---

## Sale Status

| Status | Mô tả |
|--------|-------|
| `selling` | Đang bán |
| `hot` | Bán chạy |
| `slow` | Không chạy |
| `paused` | Tạm ngưng |
