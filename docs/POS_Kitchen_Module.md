# 📱 POS Module - Hướng Dẫn FE (Local-First)

> **Approach: Local-first** - Lưu local trước, gọi API khi "Gửi pha chế"

---

## 🎯 NGUYÊN TẮC

```
✅ Click món → Lưu vào LOCAL STATE
✅ "Gửi pha chế" → Gọi API 1 lần duy nhất
❌ KHÔNG gọi API mỗi lần click
```

---

## 📦 CÁC FIELD QUAN TRỌNG

| Field | Kiểu | Dùng cho |
|-------|------|----------|
| `itemId` | number | ID món (bắt buộc) |
| `comboId` | number | ID combo (nếu món thuộc combo) |
| `quantity` | number | Số lượng |
| `customization` | **JSON** | **Đá, Đường, Size** (có cấu trúc) |
| `notes` | string | Ghi chú tự do ("Để riêng", "Ít kem") |
| `attachedToppings` | array | Topping kèm theo |

### `customization` - Dùng cho Đá, Đường, Size:

```json
{
  "customization": {
    "sugar": 50,
    "ice": 100,
    "size": "M"
  }
}
```

---

## 📋 FLOW CHI TIẾT

### Bước 1: Khách chọn món → LƯU LOCAL

```javascript
// State
const [localCart, setLocalCart] = useState([]);

// Khi bấm "Cập nhật món" trong popup
const handleAddToCart = (item, options) => {
  setLocalCart([...localCart, {
    itemId: item.id,
    comboId: item.comboId || null,
    quantity: 1,
    customization: {
      sugar: options.sugar,  // 0, 30, 50, 70, 100
      ice: options.ice,      // 0, 30, 50, 100
      size: options.size     // "S", "M", "L"
    },
    notes: options.specialNote || '',  // Ghi chú thêm
    attachedToppings: options.toppings.map(t => ({ 
      itemId: t.id, 
      quantity: 1 
    }))
  }]);
};
```

**Lúc này:**
- Món hiện ở panel phải (từ `localCart`)
- CHƯA có orderId
- CHƯA gọi API nào cả

---

### Bước 2: Bấm "Gửi pha chế" → GỌI API

```javascript
const [currentOrderId, setCurrentOrderId] = useState(null);

const handleSendToKitchen = async () => {
  if (!currentOrderId) {
    // === LẦN ĐẦU: Tạo Order mới ===
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({
        tableId: selectedTable,
        items: localCart  // Gửi hết món 1 lần
      })
    });
    
    const data = await res.json();
    const orderId = data.metaData.id;
    setCurrentOrderId(orderId);
    
    // Gửi bếp
    await fetch(`/api/orders/${orderId}/send-to-kitchen`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
  } else {
    // === LẦN SAU: Thêm món mới ===
    for (const item of localCart) {
      await fetch(`/api/orders/${currentOrderId}/items`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(item)
      });
    }
    
    // Gửi bếp
    await fetch(`/api/orders/${currentOrderId}/send-to-kitchen`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
  }
  
  // Clear cart
  setLocalCart([]);
};
```

---

### Bước 3: Thanh toán

```javascript
const handleCheckout = async (paymentMethod, paidAmount) => {
  await fetch(`/api/orders/${currentOrderId}/checkout`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` 
    },
    body: JSON.stringify({ paymentMethod, paidAmount })
  });
  
  // Reset
  setCurrentOrderId(null);
  setLocalCart([]);
};
```

---

## � TÓM TẮT API CẦN GỌI

| Thao tác | API | Khi nào |
|----------|-----|---------|
| Click món | ❌ Không | - |
| Sửa/Xóa món | ❌ Không | (local state) |
| **Gửi pha chế (lần 1)** | `POST /orders` + `POST /orders/:id/send-to-kitchen` | Bấm nút |
| **Gửi pha chế (lần 2+)** | `POST /orders/:id/items` + `POST /orders/:id/send-to-kitchen` | Bấm nút |
| **Thanh toán** | `POST /orders/:id/checkout` | Bấm nút |

---

## 📝 REQUEST FORMAT

### Tạo Order (Lần đầu gửi pha chế)

```http
POST /api/orders
```

```json
{
  "tableId": 1,
  "items": [
    {
      "itemId": 5,
      "quantity": 1,
      "customization": { "sugar": 50, "ice": 100, "size": "M" }
    },
    {
      "itemId": 8,
      "quantity": 1,
      "customization": { "sugar": 70, "ice": 50 },
      "attachedToppings": [
        { "itemId": 10, "quantity": 1 },
        { "itemId": 11, "quantity": 2 }
      ]
    }
  ]
}
```

### Thêm món (Lần sau)

```http
POST /api/orders/:orderId/items
```

```json
{
  "itemId": 3,
  "quantity": 1,
  "customization": { "sugar": 30, "ice": 0 },
  "notes": "Để riêng đá"
}
```

### Món trong Combo

```json
{
  "itemId": 5,
  "comboId": 1,
  "quantity": 1
}
```

### Gửi pha chế

```http
POST /api/orders/:orderId/send-to-kitchen
```
(Không cần body)

### Thanh toán

```http
POST /api/orders/:orderId/checkout
```

```json
{
  "paymentMethod": "cash",
  "paidAmount": 100000
}
```

---

## ⚠️ LƯU Ý

1. **FE KHÔNG gửi `name`, `unitPrice`** → Backend tự lấy từ DB
2. **Combo**: Gửi `itemId` + `comboId`, Backend tự tính giá
3. **Topping**: Gửi trong `attachedToppings[]`

---

## 🔄 COMBO FLOW

```
1. GET /api/combos/active → Lấy danh sách combo

2. User chọn combo → Popup hiện các option

3. User chọn món trong combo → Lưu vào localCart với comboId:
   {
     itemId: 5,      // Món user chọn
     comboId: 1,     // ID của combo
     quantity: 1
   }

4. Gửi pha chế → Backend tự tính giá combo
```

---

## 🏪 KITCHEN FLOW

### Bếp lấy danh sách món

```http
GET /api/orders/kitchen/items?status=preparing
```

### Bếp báo xong

```http
PATCH /api/orders/items/:itemId/status
```

```json
{
  "status": "completed",
  "all": true
}
```

---

*Cập nhật: 2026-01-11*
