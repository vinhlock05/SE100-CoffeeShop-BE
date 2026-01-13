# Promotion System - Business Logic

## I. 4 Loại Khuyến Mãi

### 1️⃣ Theo Phần Trăm

```javascript
{
  typeId: 1,
  discountValue: 20,        // 20%
  minOrderValue: 200000,    // Tối thiểu 200K
  maxDiscount: 50000        // Giảm tối đa 50K
}
```

**Logic:**
```javascript
discount = (applicableSubtotal * 20%)
discount = min(discount, maxDiscount)
discount = min(discount, applicableSubtotal)
```

---

### 2️⃣ Theo Số Tiền

```javascript
{
  typeId: 2,
  discountValue: 50000,     // Giảm 50K
  minOrderValue: 300000     // Tối thiểu 300K
}
```

**Logic:**
```javascript
discount = min(50000, applicableSubtotal)
```

**Edge Case:**
```
Order: A(15k), B(15k), C(70k) = 100k
KM: Giảm 40k cho A, B

applicableSubtotal = 30k
discount = min(40k, 30k) = 30k ✅
Dư 10k bị bỏ, KHÔNG trừ vào món C
```

---

### 3️⃣ Đồng Giá

```javascript
{
  typeId: 3,
  discountValue: 99000,     // Giá đồng giá 99K
  minOrderValue: 0
}
```

**Logic:**
```javascript
finalPrice = 99000 * totalApplicableQty
discount = applicableSubtotal - finalPrice
discount = max(0, discount)
```

---

### 4️⃣ Tặng Món (Gift)

#### Mode A: Theo giá trị đơn hàng

```javascript
{
  typeId: 4,
  minOrderValue: 500000,
  getQuantity: 1
}
```

#### Mode B: Mua X Tặng Y

**requireSameItem = false (default):**
```javascript
{
  typeId: 4,
  buyQuantity: 2,
  getQuantity: 1,
  requireSameItem: false  // Mua 2 BẤT KỲ món áp dụng
}

// Logic: Tính tổng tất cả món
totalQty = sum(all applicable items)
giftCount = floor(totalQty / 2) * 1

// Ví dụ:
// 1 CF Đen + 1 CF Sữa → totalQty = 2 → Tặng 1 ✅
// 2 CF Đen → totalQty = 2 → Tặng 1 ✅
```

**requireSameItem = true:**
```javascript
{
  typeId: 4,
  buyQuantity: 2,
  getQuantity: 1,
  requireSameItem: true  // Mua 2 CÙNG món
}

// Logic: Tính riêng cho từng món
for each item:
  itemGiftCount = floor(item.quantity / 2) * 1
totalGiftCount = sum(itemGiftCount)

// Ví dụ:
// 1 CF Đen + 1 CF Sữa → 0 + 0 = 0 ❌
// 2 CF Đen → floor(2/2)*1 = 1 ✅
// 4 CF Đen + 2 CF Sữa → floor(4/2)*1 + floor(2/2)*1 = 2 + 1 = 3 ✅
```

#### Mode C: Cả 2 điều kiện (AND)

```javascript
{
  typeId: 4,
  minOrderValue: 200000,
  buyQuantity: 2,
  getQuantity: 1,
  requireSameItem: false
}
// Phải đủ CẢ 2: >= 200k VÀ mua >= 2 món
```

---

## II. Phạm Vi Áp Dụng

### Sản phẩm
- `applicableItems` - Danh sách mặt hàng cụ thể
- `applicableCategories` - Danh sách danh mục
- **Rỗng = áp dụng TẤT CẢ**

### Khách hàng
- `applicableCustomers` - Danh sách khách cụ thể
- `applicableCustomerGroups` - Danh sách nhóm khách
- **Rỗng = áp dụng TẤT CẢ**

**Logic:** UNION (hợp) - thuộc 1 trong các phạm vi là được

---

## III. Validation Rules

### 1. Thời gian
```javascript
if (now < startDateTime) → "Chưa bắt đầu"
if (now > endDateTime) → "Đã hết hạn"
```

### 2. Giới hạn sử dụng
```javascript
if (totalUsed >= maxTotalUsage) → "Hết lượt"
if (customerUsed >= maxUsagePerCustomer) → "Bạn đã hết lượt"
```

### 3. Giá trị đơn tối thiểu
```javascript
if (orderTotal < minOrderValue) → "Đơn hàng tối thiểu {value}đ"
```

**Lưu ý:** `minOrderValue` áp dụng cho TỔNG HÓA ĐƠN

---

## IV. Flow Xử Lý

### Kiểm tra eligibility
```
1. Promotion tồn tại & active
2. Trong thời gian hiệu lực
3. Chưa hết lượt (total + per customer)
4. Khách thuộc phạm vi áp dụng
```

### Áp dụng promotion
```
1. Kiểm tra eligibility
2. Kiểm tra minOrderValue (trên TỔNG đơn)
3. Lọc món thuộc phạm vi
4. Tính applicableSubtotal
5. Tính discount theo type
6. Cap discount tại applicableSubtotal
7. Ghi nhận usage (1 lần/đơn)
```

---

## V. Công Thức Tổng Hợp

```typescript
// 1. Lọc món áp dụng
applicableItems = getApplicableItems(orderItems)
applicableSubtotal = sum(applicableItems)

// 2. Tính discount theo type
switch (typeId) {
  case 1: // Percentage
    discount = applicableSubtotal * (discountValue / 100)
    discount = min(discount, maxDiscount || Infinity)
    break
    
  case 2: // Fixed Amount
    discount = discountValue
    break
    
  case 3: // Fixed Price
    finalPrice = discountValue * totalQty
    discount = applicableSubtotal - finalPrice
    discount = max(0, discount)
    break
    
  case 4: // Gift
    discount = 0
    break
}

// 3. Cap discount
discount = min(discount, applicableSubtotal)
```

---

## VI. Nguyên Tắc Quan Trọng

1. ✅ **minOrderValue** áp dụng cho TỔNG HÓA ĐƠN
2. ✅ **Discount** chỉ tính trên món trong phạm vi
3. ✅ **Discount** KHÔNG ĐƯỢC vượt quá `applicableSubtotal`
4. ✅ **Usage** = 1 lần/đơn hàng (không phụ thuộc số món)
5. ✅ **Phạm vi rỗng** = áp dụng cho TẤT CẢ
6. ✅ **Phạm vi trùng** = sử dụng UNION (hợp)
7. ✅ **Gift AND** = cả 2 điều kiện phải đủ
8. ✅ **requireSameItem** = false: đếm tổng, true: đếm riêng từng món
