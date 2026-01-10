import { prisma } from '../config/database'
import bcrypt from 'bcrypt'

// All permissions from FE permissionData.ts
const ALL_PERMISSIONS = [
  // System - Người dùng
  { id: 'system_users:view', name: 'Xem danh sách', category: 'system' },
  { id: 'system_users:create', name: 'Thêm mới', category: 'system' },
  { id: 'system_users:update', name: 'Cập nhật', category: 'system' },
  { id: 'system_users:delete', name: 'Xóa', category: 'system' },
  // Dashboard
  { id: 'dashboard:view', name: 'Xem', category: 'dashboard' },
  // Goods - Danh mục
  { id: 'goods_inventory:view', name: 'Xem danh sách', category: 'goods' },
  { id: 'goods_inventory:create', name: 'Thêm mới', category: 'goods' },
  { id: 'goods_inventory:update', name: 'Cập nhật', category: 'goods' },
  { id: 'goods_inventory:delete', name: 'Xóa', category: 'goods' },
  // Goods - Thiết lập giá
  { id: 'goods_pricing:view', name: 'Xem', category: 'goods' },
  { id: 'goods_pricing:update', name: 'Cập nhật', category: 'goods' },
  // Goods - Kiểm kho
  { id: 'goods_stock_check:view', name: 'Xem', category: 'goods' },
  { id: 'goods_stock_check:create', name: 'Tạo phiếu', category: 'goods' },
  // Goods - Nhập/Xuất
  { id: 'goods_import_export:view', name: 'Xem', category: 'goods' },
  { id: 'goods_import_export:create', name: 'Tạo phiếu', category: 'goods' },
  // Goods - Công thức
  { id: 'goods_recipe:view', name: 'Xem', category: 'goods' },
  { id: 'goods_recipe:update', name: 'Cập nhật', category: 'goods' },
  // Tables - Phòng/Bàn
  { id: 'tables:view', name: 'Xem', category: 'tables' },
  { id: 'tables:create', name: 'Thêm mới', category: 'tables' },
  { id: 'tables:update', name: 'Cập nhật', category: 'tables' },
  { id: 'tables:delete', name: 'Xóa', category: 'tables' },
  // Partners - Khách hàng
  { id: 'customers:view', name: 'Xem danh sách', category: 'partners' },
  { id: 'customers:create', name: 'Thêm mới', category: 'partners' },
  { id: 'customers:update', name: 'Cập nhật', category: 'partners' },
  { id: 'customers:delete', name: 'Xóa', category: 'partners' },
  // Partners - Nhóm khách hàng
  { id: 'customer_groups:view', name: 'Xem danh sách', category: 'partners' },
  { id: 'customer_groups:create', name: 'Thêm mới', category: 'partners' },
  { id: 'customer_groups:update', name: 'Cập nhật', category: 'partners' },
  { id: 'customer_groups:delete', name: 'Xóa', category: 'partners' },
  // Partners - Nhà cung cấp
  { id: 'suppliers:view', name: 'Xem danh sách', category: 'partners' },
  { id: 'suppliers:create', name: 'Thêm mới', category: 'partners' },
  { id: 'suppliers:update', name: 'Cập nhật', category: 'partners' },
  { id: 'suppliers:delete', name: 'Xóa', category: 'partners' },
  // Partners - Khuyến mại
  { id: 'promotions:view', name: 'Xem danh sách', category: 'partners' },
  { id: 'promotions:create', name: 'Thêm mới', category: 'partners' },
  { id: 'promotions:update', name: 'Cập nhật', category: 'partners' },
  { id: 'promotions:delete', name: 'Xóa', category: 'partners' },
  // Staff - Danh sách nhân viên
  { id: 'staff:view', name: 'Xem danh sách', category: 'staff' },
  { id: 'staff:create', name: 'Thêm mới', category: 'staff' },
  { id: 'staff:update', name: 'Cập nhật', category: 'staff' },
  { id: 'staff:delete', name: 'Xóa', category: 'staff' },
  // Staff - Lịch làm việc
  { id: 'staff_scheduling:view', name: 'Xem', category: 'staff' },
  { id: 'staff_scheduling:update', name: 'Cập nhật', category: 'staff' },
  // Staff - Chấm công
  { id: 'staff_timekeeping:view', name: 'Xem', category: 'staff' },
  { id: 'staff_timekeeping:update', name: 'Chấm công', category: 'staff' },
  // Staff - Bảng lương
  { id: 'staff_payroll:view', name: 'Xem', category: 'staff' },
  { id: 'staff_payroll:create', name: 'Tạo bảng lương', category: 'staff' },
  { id: 'staff_payroll:update', name: 'Cập nhật', category: 'staff' },
  { id: 'staff_payroll:delete', name: 'Xóa', category: 'staff' },
  { id: 'staff_payroll:payment', name: 'Thanh toán', category: 'staff' },
  // Transactions - Hóa đơn
  { id: 'invoices:view', name: 'Xem', category: 'transactions' },
  { id: 'invoices:create', name: 'Tạo', category: 'transactions' },
  { id: 'invoices:update', name: 'Cập nhật', category: 'transactions' },
  { id: 'invoices:delete', name: 'Xóa', category: 'transactions' },
  // Transactions - Trả hàng (khách trả)
  { id: 'returns:view', name: 'Xem', category: 'transactions' },
  { id: 'returns:create', name: 'Tạo', category: 'transactions' },
  // Transactions - Nhập hàng
  { id: 'purchase_orders:view', name: 'Xem', category: 'transactions' },
  { id: 'purchase_orders:create', name: 'Tạo', category: 'transactions' },
  { id: 'purchase_orders:update', name: 'Cập nhật', category: 'transactions' },
  // Transactions - Xuất hủy
  { id: 'write_offs:view', name: 'Xem', category: 'transactions' },
  { id: 'write_offs:create', name: 'Tạo', category: 'transactions' },
  // Finance - Sổ quỹ
  { id: 'finance:view', name: 'Xem', category: 'finance' },
  { id: 'finance:create', name: 'Thêm phiếu', category: 'finance' },
  { id: 'finance:update', name: 'Cập nhật', category: 'finance' },
  { id: 'finance:delete', name: 'Xóa', category: 'finance' },
  // Reports - Báo cáo
  { id: 'reports:view', name: 'Xem', category: 'reports' },
  // Special - POS
  { id: 'pos:access', name: 'Truy cập', category: 'special' },
  // Special - Bếp/Pha chế
  { id: 'kitchen:access', name: 'Truy cập', category: 'special' },
]

// Role definitions with their permissions
const ROLE_DEFINITIONS = [
  {
    name: 'Quản lý',
    description: 'Toàn quyền quản lý hệ thống',
    isSystem: true,
    permissions: ALL_PERMISSIONS.map(p => p.id)
  },
  {
    name: 'Thu ngân',
    description: 'Nhân viên thu ngân - Quản lý bán hàng và khách hàng',
    isSystem: true,
    permissions: [
      'pos:access',
      'dashboard:view',
      'invoices:view',
      'invoices:create',
      'invoices:update',
      'customers:view',
      'customers:create',
      'customers:update',
      'goods_inventory:view',
      'goods_pricing:view',
    ]
  },
  {
    name: 'Phục vụ',
    description: 'Nhân viên phục vụ - Quản lý bàn và đơn hàng',
    isSystem: true,
    permissions: [
      'pos:access',
      'dashboard:view',
      'tables:view',
      'tables:update',
      'invoices:view',
      'invoices:create',
      'goods_inventory:view',
    ]
  },
  {
    name: 'Pha chế',
    description: 'Nhân viên pha chế - Xem và xử lý đơn hàng',
    isSystem: true,
    permissions: [
      'kitchen:access',
      'dashboard:view',
      'goods_inventory:view',
      'goods_recipe:view',
    ]
  },
]

// Default users
const DEFAULT_USERS = [
  { username: 'admin', roleName: 'Quản lý', password: '123456' },
  { username: 'phache', roleName: 'Pha chế', password: '123456' },
  { username: 'thungan', roleName: 'Thu ngân', password: '123456' },
  { username: 'phucvu', roleName: 'Phục vụ', password: '123456' },
]

export async function seedPermissions() {
  const results = []
  for (const perm of ALL_PERMISSIONS) {
    const result = await prisma.permission.upsert({
      where: { id: perm.id },
      update: { name: perm.name, category: perm.category },
      create: perm
    })
    results.push(result)
  }
  return results
}

export async function seedRoles() {
  const results = []
  
  for (const roleDef of ROLE_DEFINITIONS) {
    const role = await prisma.role.upsert({
      where: { name: roleDef.name },
      update: { description: roleDef.description, isSystem: roleDef.isSystem },
      create: { 
        name: roleDef.name, 
        description: roleDef.description, 
        isSystem: roleDef.isSystem 
      }
    })
    
    await prisma.rolePermission.deleteMany({
      where: { roleId: role.id }
    })
    
    for (const permId of roleDef.permissions) {
      await prisma.rolePermission.create({
        data: {
          roleId: role.id,
          permissionId: permId
        }
      })
    }
    
    results.push(role)
  }
  
  return results
}

export async function seedUsers() {
  const results = []
  
  for (const userDef of DEFAULT_USERS) {
    const role = await prisma.role.findUnique({
      where: { name: userDef.roleName }
    })
    
    if (!role) {
      console.warn(`⚠️ Role ${userDef.roleName} not found, skipping user ${userDef.username}`)
      continue
    }
    
    const existingUser = await prisma.user.findUnique({
      where: { username: userDef.username }
    })
    
    if (existingUser) {
      const user = await prisma.user.update({
        where: { username: userDef.username },
        data: { roleId: role.id }
      })
      results.push(user)
    } else {
      const hashedPassword = await bcrypt.hash(userDef.password, 10)
      const user = await prisma.user.create({
        data: {
          username: userDef.username,
          passwordHash: hashedPassword,
          roleId: role.id,
          status: 'active'
        }
      })
      results.push(user)
    }
  }
  
  return results
}
