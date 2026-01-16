import { prisma } from '~/config/database'
import { BadRequestError, NotFoundRequestError } from '~/core/error.response'
import { parsePagination, unGetData, generateCode } from '~/utils/helpers'
import { CreateStaffDto, UpdateStaffDto, StaffQueryDto } from '~/dtos/staff'
import { hashData } from '~/utils/jwt'
import { Prisma } from '@prisma/client'

export class StaffService {
  /**
   * Create new staff with optional salary settings and user account
   */
  async createStaff(dto: CreateStaffDto) {
    // Check username if provided
    if (dto.username) {
      const existingUser = await prisma.user.findUnique({
        where: { username: dto.username }
      })
      if (existingUser) {
        throw new BadRequestError({ message: 'Username already exists' })
      }
    }

    // Use transaction to ensure data integrity
    return await prisma.$transaction(async (tx) => {
      // 1. Create Staff with temp code
      const staff = await tx.staff.create({
        data: {
          code: 'TEMP',
          fullName: dto.fullName,
          gender: dto.gender,
          birthday: dto.birthday ? new Date(dto.birthday) : null,
          phone: dto.phone,
          email: dto.email,
          address: dto.address,
          city: dto.city,
          idCard: dto.idCard,
          position: dto.position,
          department: dto.department,
          hireDate: dto.hireDate ? new Date(dto.hireDate) : null,
          status: 'active'
        }
      })

      // 1.1 Update code based on ID
      await tx.staff.update({
        where: { id: staff.id },
        data: { code: generateCode('NV', staff.id) }
      })

      // 2. Create Salary Setting if provided
      if (dto.salaryType && dto.baseRate !== undefined) {
        await tx.staffSalarySetting.create({
          data: {
            staffId: staff.id,
            salaryType: dto.salaryType,
            baseRate: dto.baseRate,
          }
        })
      }

      // 3. Create User Account if provided
      if (dto.username && dto.password && dto.roleId) {
        // Check role exists
        const role = await tx.role.findUnique({
          where: { id: dto.roleId }
        })
        if (!role) throw new BadRequestError({ message: 'Role not found' })

        const passwordHash = await hashData(dto.password)
        
        const user = await tx.user.create({
          data: {
            username: dto.username,
            passwordHash,
            roleId: dto.roleId,
            status: 'active'
          }
        })

        // Link with staff
        await tx.staff.update({
          where: { id: staff.id },
          data: { userId: user.id }
        })
        
        return {
          ...staff,
          code: generateCode('NV', staff.id),
          user: unGetData({ fields: ['passwordHash', 'deletedAt'], object: user })
        }
      }

      return { ...staff, code: generateCode('NV', staff.id) }
    })
  }

  /**
   * Get all staff with pagination and filters
   */
  async getAllStaff(query: StaffQueryDto) {
    const { page, limit, skip } = parsePagination(
      query.page ? Number(query.page) : undefined, 
      query.limit ? Number(query.limit) : undefined
    )
    
    const where: Prisma.StaffWhereInput = {
      deletedAt: null
    }

    if (query.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { fullName: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } }
      ]
    }

    if (query.department) where.department = query.department
    if (query.position) where.position = query.position
    if (query.status) where.status = query.status

    // Build orderBy
    const orderBy = query.sort
      ? (Object.entries(query.sort).map(([key, value]) => ({ [key]: value.toLowerCase() })) as any)
      : { createdAt: 'desc' }

    const [staffs, total] = await Promise.all([
      prisma.staff.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              role: { select: { id: true, name: true } }
            }
          },
          // Get current salary setting
          salarySetting: true
        }
      }),
      prisma.staff.count({ where })
    ])

    return {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      total,
      staffs
    }
  }

  /**
   * Get staff by ID
   */
  async getStaffById(id: number) {
    const staff = await prisma.staff.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: { select: { id: true, name: true } },
            status: true,
            lastLogin: true
          }
        },
        salarySetting: true
      }
    })

    if (!staff || staff.deletedAt) {
      throw new NotFoundRequestError('Staff not found')
    }

    return staff
  }

  /**
   * Update staff info
   */
  async updateStaff(id: number, dto: UpdateStaffDto) {
    const staff = await prisma.staff.findUnique({ where: { id } })
    if (!staff || staff.deletedAt) throw new NotFoundRequestError('Staff not found')

    return await prisma.$transaction(async (tx) => {
      // 1. Update basic info
      const updateData: Prisma.StaffUpdateInput = {}
      if (dto.fullName) updateData.fullName = dto.fullName
      if (dto.gender) updateData.gender = dto.gender
      if (dto.birthday) updateData.birthday = new Date(dto.birthday)
      if (dto.phone) updateData.phone = dto.phone
      if (dto.email) updateData.email = dto.email
      if (dto.address) updateData.address = dto.address
      if (dto.city) updateData.city = dto.city
      if (dto.idCard) updateData.idCard = dto.idCard
      if (dto.position) updateData.position = dto.position
      if (dto.department) updateData.department = dto.department
      if (dto.hireDate) updateData.hireDate = new Date(dto.hireDate)
      if (dto.status) updateData.status = dto.status

      const updatedStaff = await tx.staff.update({
        where: { id },
        data: updateData
      })

      // 2. Handle Account Logic (Unified)
      if (dto.username || dto.roleId || dto.password) {
        if (!staff.userId) {
          // Case A: Create NEW Account for Staff
          if (dto.username && dto.password && dto.roleId) {
            // Check username exist
            const existingUser = await tx.user.findUnique({ where: { username: dto.username } })
            if (existingUser) throw new BadRequestError({ message: 'Username already exists' })

            const passwordHash = await hashData(dto.password)
            const newUser = await tx.user.create({
              data: {
                username: dto.username,
                passwordHash,
                roleId: dto.roleId,
                status: 'active'
              }
            })
            // Link to staff
            await tx.staff.update({ where: { id }, data: { userId: newUser.id } })
          } else {
             // If missing fields for creation, we can ignore or throw error. 
             // Ideally frontend should force all fields if "Create Account" is checked.
             // Here we do nothing if not full info.
          }
        } else {
          // Case B: Update EXISTING Account
          const userUpdateData: any = {}
          
          // Update username
          if (dto.username) {
            const currentUser = await tx.user.findUnique({ where: { id: staff.userId } })
            if (currentUser && currentUser.username !== dto.username) {
               const existing = await tx.user.findUnique({ where: { username: dto.username } })
               if (existing) throw new BadRequestError({ message: 'Username already exists' })
               userUpdateData.username = dto.username
            }
          }

          // Update password
          if (dto.password) {
            userUpdateData.passwordHash = await hashData(dto.password)
          }

          // Update role
          if (dto.roleId) {
            userUpdateData.roleId = dto.roleId
          }
           // Sync status if staff status changes (optional, handled below)

          if (Object.keys(userUpdateData).length > 0) {
            await tx.user.update({
              where: { id: staff.userId },
              data: userUpdateData
            })
          }
        }
      }

      // 3. Update Status Sync (Staff -> User)
      if (dto.status && staff.userId) {
         // If staff is inactive/quit, user should be inactive
         const userStatus = (dto.status === 'active') ? 'active' : 'inactive'
         await tx.user.update({
           where: { id: staff.userId },
           data: { status: userStatus }
         })
      }

      // 4. Update Salary (upsert)
      if (dto.newSalaryType && dto.newBaseRate !== undefined) {
        await tx.staffSalarySetting.upsert({
          where: { staffId: id },
          create: {
            staffId: id,
            salaryType: dto.newSalaryType,
            baseRate: dto.newBaseRate
          },
          update: {
            salaryType: dto.newSalaryType,
            baseRate: dto.newBaseRate
          }
        })
      }

      return updatedStaff
    })
  }

  /**
   * Delete staff (soft delete)
   */
  async deleteStaff(id: number) {
    const staff = await prisma.staff.findUnique({ where: { id } })
    if (!staff || staff.deletedAt) throw new NotFoundRequestError('Staff not found')

    // Start transaction
    await prisma.$transaction(async (tx) => {
      // Soft delete staff
      await tx.staff.update({
        where: { id },
        data: { 
          deletedAt: new Date(),
          status: 'quit' // Mark as quit
        }
      })

      // If linked with user, deactivate user
      if (staff.userId) {
        await tx.user.update({
          where: { id: staff.userId },
          data: { 
            status: 'inactive',
            deletedAt: new Date()
          }
        })
      }
    })

    return { message: 'Staff deleted successfully' }
  }
}

export const staffService = new StaffService()
