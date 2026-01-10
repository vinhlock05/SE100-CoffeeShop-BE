import { prisma } from '../config/database'
import bcrypt from 'bcrypt'
import { seedTables } from './table.seed'

/**
 * Seed initial data for the application
 * This function is called on every server startup
 * Uses upsert to check if data exists before seeding
 */
export async function seedInitialData() {
  console.log('🌱 Starting seed...')

  // Seed ItemTypes
  const itemTypes = await seedItemTypes()
  console.log(`✅ Seeded ${itemTypes.length} item types`)

  // Seed FinanceTypes
  const financeTypes = await seedFinanceTypes()
  console.log(`✅ Seeded ${financeTypes.length} finance types`)

  // Seed PromotionTypes
  const promotionTypes = await seedPromotionTypes()
  console.log(`✅ Seeded ${promotionTypes.length} promotion types`)

  // Seed Permissions
  const permissions = await seedPermissions()
  console.log(`✅ Seeded ${permissions.length} permissions`)

  // Seed Roles with permissions
  const roles = await seedRoles()
  console.log(`✅ Seeded ${roles.length} roles`)

  // Seed default Users
  const users = await seedUsers()
  console.log(`✅ Seeded ${users.length} users`)

  // Seed Tables and Areas
  const tables = await seedTables()

  console.log('🌱 Seed completed!')
}

async function seedItemTypes() {
  const itemTypes = [
    { name: 'ready_made' },
    { name: 'composite' },
    { name: 'ingredient' }
  ]

  const results = []
  for (const type of itemTypes) {
    const result = await prisma.itemType.upsert({
      where: { name: type.name },
      update: {},
      create: type
    })
    results.push(result)
  }
  return results
}

async function seedFinanceTypes() {
  const financeTypes = [
    { id: 1, name: 'Thu' },
    { id: 2, name: 'Chi' }
  ]

  const results = []
  for (const type of financeTypes) {
    const result = await prisma.financeType.upsert({
      where: { id: type.id },
      update: { name: type.name },
      create: type
    })
    results.push(result)
  }
  return results
}

async function seedPromotionTypes() {
  const promotionTypes = [
    { id: 1, name: 'Giảm giá phần trăm' },
    { id: 2, name: 'Giảm giá cố định' },
    { id: 3, name: 'Mua X tặng Y' },
    { id: 4, name: 'Giảm giá theo sản phẩm' }
  ]

  const results = []
  for (const type of promotionTypes) {
    const result = await prisma.promotionType.upsert({
      where: { id: type.id },
      update: { name: type.name },
      create: type
    })
    results.push(result)
  }
  return results
}

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
  // Goods - Yêu cầu món mới
  { id: 'goods_new_items:view', name: 'Xem', category: 'goods' },
  { id: 'goods_new_items:update', name: 'Duyệt', category: 'goods' },
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
  // Staff - Thiết lập
  { id: 'staff_settings:view', name: 'Xem', category: 'staff' },
  { id: 'staff_settings:update', name: 'Cập nhật', category: 'staff' },
  // Transactions - Hóa đơn
  { id: 'invoices:view', name: 'Xem', category: 'transactions' },
  { id: 'invoices:create', name: 'Tạo', category: 'transactions' },
  { id: 'invoices:update', name: 'Cập nhật', category: 'transactions' },
  { id: 'invoices:delete', name: 'Xóa', category: 'transactions' },
  // Transactions - Trả hàng
  { id: 'returns:view', name: 'Xem', category: 'transactions' },
  { id: 'returns:create', name: 'Tạo', category: 'transactions' },
  // Transactions - Nhập hàng
  { id: 'purchase_orders:view', name: 'Xem', category: 'transactions' },
  { id: 'purchase_orders:create', name: 'Tạo', category: 'transactions' },
  { id: 'purchase_orders:update', name: 'Cập nhật', category: 'transactions' },
  // Transactions - Trả hàng nhập
  { id: 'purchase_returns:view', name: 'Xem', category: 'transactions' },
  { id: 'purchase_returns:create', name: 'Tạo', category: 'transactions' },
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

async function seedPermissions() {
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

// Role definitions with their permissions (from FE roleData.ts)
const ROLE_DEFINITIONS = [
  {
    name: 'Quản lý',
    description: 'Toàn quyền quản lý hệ thống',
    isSystem: true,
    permissions: ALL_PERMISSIONS.map(p => p.id) // All permissions
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

async function seedRoles() {
  const results = []

  for (const roleDef of ROLE_DEFINITIONS) {
    // First upsert the role
    const role = await prisma.role.upsert({
      where: { name: roleDef.name },
      update: { description: roleDef.description, isSystem: roleDef.isSystem },
      create: {
        name: roleDef.name,
        description: roleDef.description,
        isSystem: roleDef.isSystem
      }
    })

    // Delete existing role permissions
    await prisma.rolePermission.deleteMany({
      where: { roleId: role.id }
    })

    // Create role permissions
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

// Default users from FE accountData.ts
// Note: fullName is stored in Staff, not User
const DEFAULT_USERS = [
  { username: 'admin', roleName: 'Quản lý', password: '123456' },
  { username: 'phache', roleName: 'Pha chế', password: '123456' },
  { username: 'thungan', roleName: 'Thu ngân', password: '123456' },
  { username: 'phucvu', roleName: 'Phục vụ', password: '123456' },
]

async function seedUsers() {
  const results = []

  for (const userDef of DEFAULT_USERS) {
    // Find role by name
    const role = await prisma.role.findUnique({
      where: { name: userDef.roleName }
    })

    if (!role) {
      console.warn(`⚠️ Role ${userDef.roleName} not found, skipping user ${userDef.username}`)
      continue
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { username: userDef.username }
    })

    if (existingUser) {
      // Update existing user role
      const user = await prisma.user.update({
        where: { username: userDef.username },
        data: {
          roleId: role.id,
        }
      })
      results.push(user)
    } else {
      // Create new user with hashed password
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

// Export for direct execution (npm run db:seed)
// Note: When called from index.ts, this block won't execute
if (require.main === module) {
  seedInitialData()
    .catch((e) => {
      console.error('❌ Seed failed:', e)
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}
