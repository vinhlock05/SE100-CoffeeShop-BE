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

**Điều kiện:** Có thể có `minOrderValue` AND/OR `buyQuantity/getQuantity`

#### Mode A: Chỉ theo giá trị đơn hàng

```javascript
{
  typeId: 4,
  minOrderValue: 500000,  // Chỉ cần đủ 500K
  getQuantity: 1
}
```

#### Mode B: Chỉ theo số lượng (Mua X Tặng Y)

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

#### Mode C: Kết hợp cả 2 điều kiện (AND)

```javascript
{
  typeId: 4,
  minOrderValue: 200000,  // Điều kiện 1: >= 200K
  buyQuantity: 3,          // Điều kiện 2: Mua >= 3 món
  getQuantity: 1,
  requireSameItem: false
}
// Phải đủ CẢ 2: >= 200K VÀ mua >= 3 món
// Ví dụ: Mua 3 ly từ 200K tặng 1 ly
```

---

## II. Phạm Vi Áp Dụng (Scopes)

### 1. Phạm vi sản phẩm

#### Boolean Flags (NEW)
```typescript
{
  applyToAllItems: boolean       // true = TẤT CẢ items
  applyToAllCategories: boolean  // true = TẤT CẢ categories
  applyToAllCombos: boolean      // true = TẤT CẢ combos
}
```

**Quy tắc:**
- `applyToAll` flag = `true` → Tương ứng array phải rỗng
- Không thể mix item/category scope với combo scope
- Phải có ít nhất 1 scope (flag HOẶC array)

#### Riêng lẻ (Items/Categories)

**Ví dụ:**
```javascript
// Case 1: Tất cả items
{
  applyToAllItems: true,
  applyToAllCategories: false,
  applicableItemIds: [],
  applicableCategoryIds: []
}

// Case 2: Tất cả categories
{
  applyToAllItems: false,
  applyToAllCategories: true,
  applicableItemIds: [],
  applicableCategoryIds: []
}

// Case 3: Items cụ thể
{
  applyToAllItems: false,
  applyToAllCategories: false,
  applicableItemIds: [1, 2],
  applicableCategoryIds: []
}

// Case 4: Categories cụ thể
{
  applyToAllItems: false,
  applyToAllCategories: false,
  applicableItemIds: [],
  applicableCategoryIds: [1, 2]
}

// Case 5: Items HOẶC Categories
{
  applyToAllItems: false,
  applyToAllCategories: false,
  applicableItemIds: [1, 2],
  applicableCategoryIds: [3]
}
// → Match nếu: itemId = 1 OR itemId = 2 OR categoryId = 3
```

**Logic:**
- Item match nếu `itemId` trong `applicableItemIds` **HOẶC** `categoryId` trong `applicableCategoryIds`
- Nếu `applyToAllItems = true` → TẤT CẢ items match
- Nếu `applyToAllCategories = true` → TẤT CẢ categories match

#### Combo

**Ví dụ:**
```javascript
// Tất cả combos
{
  applyToAllCombos: true,
  applicableComboIds: []
}

// Combos cụ thể
{
  applyToAllCombos: false,
  applicableComboIds: [1, 2]
}
```

**Lưu ý:** Combo được coi như 1 entity riêng, không phân tách thành items

### 2. Phạm vi khách hàng

#### Boolean Flags (UPDATED)
```typescript
{
  applyToAllCustomers: boolean       // true = TẤT CẢ thành viên
  applyToAllCustomerGroups: boolean  // true = TẤT CẢ nhóm khách
  applyToWalkIn: boolean             // true = Cho phép khách vãng lai
}
```

**Semantics:**
- `applyToAllCustomers` = Tất cả **thành viên** (không bao gồm vãng lai)
- `applyToWalkIn` = Cho phép **khách vãng lai** sử dụng
- Hai flags **độc lập**, có thể combine

**Ví dụ:**
```javascript
// Case 1: Chỉ thành viên
{
  applyToAllCustomers: true,
  applyToWalkIn: false,
  applicableCustomerIds: [],
  applicableCustomerGroupIds: []
}

// Case 2: Tất cả (thành viên + vãng lai)
{
  applyToAllCustomers: true,
  applyToWalkIn: true,
  applicableCustomerIds: [],
  applicableCustomerGroupIds: []
}

// Case 3: Khách cụ thể + vãng lai
{
  applyToAllCustomers: false,
  applyToWalkIn: true,
  applicableCustomerIds: [1, 2],
  applicableCustomerGroupIds: []
}

// Case 4: Chỉ khách cụ thể (không vãng lai)
{
  applyToAllCustomers: false,
  applyToWalkIn: false,
  applicableCustomerIds: [1, 2],
  applicableCustomerGroupIds: []
}

// Case 5: Chỉ vãng lai (không thành viên)
{
  applyToAllCustomers: false,
  applyToWalkIn: true,
  applicableCustomerIds: [],
  applicableCustomerGroupIds: [],
  maxUsagePerCustomer: null  // MUST be null
}

// Case 6: Tất cả nhóm khách (chỉ thành viên)
{
  applyToAllCustomers: false,
  applyToAllCustomerGroups: true,
  applyToWalkIn: false,
  applicableCustomerIds: [],
  applicableCustomerGroupIds: []
}
```

**Logic:** UNION (hợp)
- Khách hàng match nếu thuộc `applicableCustomerIds` **HOẶC** thuộc group trong `applicableCustomerGroupIds`
- Nếu `applyToAllCustomers = true` → TẤT CẢ thành viên
- Nếu `applyToAllCustomerGroups = true` → TẤT CẢ nhóm (chỉ thành viên)
- Nếu `applyToWalkIn = true` → Khách vãng lai được phép

#### Khách Vãng Lai (customerId = null)

**✅ CÓ THỂ sử dụng KM nếu:**
1. `applyToWalkIn = true`
2. Không có `maxUsagePerCustomer` limit

**❌ KHÔNG THỂ sử dụng KM nếu:**
1. `applyToWalkIn = false`
2. Có `maxUsagePerCustomer` (cần track usage per customer)

**Lý do:** Không thể track usage của khách vãng lai

**Ví dụ:**
```javascript
// ✅ OK cho khách vãng lai
{
  name: "Giảm 20% cho tất cả",
  applyToAllCustomers: true,
  applyToWalkIn: true,
  maxTotalUsage: 100,
  maxUsagePerCustomer: null
}

// ❌ KHÔNG OK cho khách vãng lai (applyToWalkIn = false)
{
  name: "Giảm 30% cho thành viên",
  applyToAllCustomers: true,
  applyToWalkIn: false,
  maxUsagePerCustomer: 3
}

// ✅ OK cho khách vãng lai (specific customers + walk-in)
{
  name: "Giảm 15% cho khách quen + vãng lai",
  applyToAllCustomers: false,
  applyToWalkIn: true,
  applicableCustomerIds: [1, 2, 3],
  maxUsagePerCustomer: null
}
```

**Bảng tổng hợp:**

| applyToAllCustomers | applyToWalkIn | specificCustomers | Thành viên | Vãng lai |
|---------------------|---------------|-------------------|------------|----------|
| `false` | `false` | `[]` | ✅ Tất cả | ❌ Không |
| `false` | `true` | `[]` | ✅ Tất cả | ✅ Có |
| `true` | `false` | - | ✅ Tất cả | ❌ Không |
| `true` | `true` | - | ✅ Tất cả | ✅ Có |
| `false` | `false` | `[1,2]` | ✅ Chỉ 1,2 | ❌ Không |
| `false` | `true` | `[1,2]` | ✅ Chỉ 1,2 | ✅ Có |

---

## III. Validation Rules

### 1. Thời gian
```javascript
if (now < startDateTime) → "Chưa bắt đầu"
if (now > endDateTime) → "Đã hết hạn"
if (endDateTime <= startDateTime) → "Ngày kết thúc phải sau ngày bắt đầu"
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

### 4. Product Scope (NEW)
```javascript
// Không được conflict flag với array
if (applyToAllItems && applicableItemIds.length > 0) → Error

// Không được mix item/category với combo
if (hasItemScope && hasComboScope) → Error

// Phải có ít nhất 1 scope
if (!hasItemScope && !hasComboScope) → Error
```

---

## IV. Flow Xử Lý

### Kiểm tra eligibility
```
1. Promotion tồn tại & active
2. Trong thời gian hiệu lực
3. Chưa hết lượt (total + per customer)
4. Khách thuộc phạm vi áp dụng
5. Khách vãng lai: Check maxUsagePerCustomer & customer scope
```

### Áp dụng promotion
```
1. Kiểm tra eligibility
2. Kiểm tra minOrderValue (trên TỔNG đơn)
3. Lọc món thuộc phạm vi (dùng flags)
4. Tính applicableSubtotal
5. Tính discount theo type
6. Cap discount tại applicableSubtotal
7. Ghi nhận usage (1 lần/đơn)
```

### Hủy áp dụng promotion
```
1. Tìm PromotionUsage record
2. Xóa record
3. Giảm currentTotalUsage counter
```

---

## V. Công Thức Tổng Hợp

```typescript
// 1. Lọc món áp dụng (dùng flags)
if (applyToAllItems || applyToAllCategories) {
  applicableItems = all items
} else {
  applicableItems = getApplicableItems(orderItems)
}
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
    totalQty = sum(applicableItems.quantity)
    finalPrice = discountValue * totalQty
    discount = applicableSubtotal - finalPrice
    break
    
  case 4: // Gift
    // See gift logic above
    break
}

// 3. Cap discount
discount = min(discount, applicableSubtotal)
discount = max(discount, 0)
```

---

## VI. API Endpoints

### 1. CRUD Operations
- `GET /api/promotions` - List with pagination, filters, search
- `GET /api/promotions/:id` - Get by ID with stats
- `POST /api/promotions` - Create promotion
- `PATCH /api/promotions/:id` - Update promotion
- `DELETE /api/promotions/:id` - Soft delete

### 2. Promotion Actions

#### Get Available Promotions
```
POST /api/promotions/available
Body: {
  customerId?: number,  // Optional for walk-in customers
  orderId: number
}

Response: [
  {
    id: 1,
    code: "KM001",
    name: "Giảm 20%",
    canApply: false,
    reason: "Đơn hàng tối thiểu 200,000đ"
  }
]
```

#### Apply Promotion
```
POST /api/promotions/apply
Body: {
  promotionId: number,
  orderId: number
}

Response: {
  discountAmount: number,
  applicableSubtotal: number,
  giftItems?: [...],
  totalGiftQuantity?: number
}
```

#### Unapply Promotion
```
POST /api/promotions/unapply
Body: {
  promotionId: number,
  orderId: number
}

Response: {
  message: "Đã hủy áp dụng khuyến mãi"
}
```

#### Check Eligibility
```
GET /api/promotions/:id/check-eligibility?customerId=1

Response: {
  eligible: boolean,
  reason?: string
}
```

---

## VII. Summary

### Boolean Flags System
- ✅ Explicit "ALL" indication
- ✅ No ambiguity between "all" and "none"
- ✅ Clear FE/BE contract
- ✅ Validation ensures consistency

### Walk-in Customer Support
- ✅ Can use general promotions
- ✅ Blocked from member-only promotions
- ✅ Blocked from usage-tracked promotions
- ✅ Clear error messages

### Data Integrity
- ✅ Soft delete
- ✅ Auto-generated codes
- ✅ Proper relations
- ✅ Usage tracking
