import { prisma } from '~/config/database'
import { BadRequestError, NotFoundRequestError } from '~/core/error.response'
import { generateCode, parsePagination } from '~/utils/helpers'
import { updateItemStockStatus } from '~/utils/stockStatus.helper'
import { CreateItemDto, UpdateItemDto, ItemQueryDto } from '~/dtos/inventoryItem'
import { Prisma } from '@prisma/client'

class InventoryItemService {
  /**
   * Create new inventory item
   */
  async createItem(dto: CreateItemDto) {
    // Check duplicate name
    const existingItem = await prisma.inventoryItem.findFirst({
      where: { 
        name: { equals: dto.name, mode: 'insensitive' },
        deletedAt: null 
      }
    })
    if (existingItem) {
      throw new BadRequestError({ message: `Sản phẩm "${dto.name}" đã tồn tại` })
    }

    // Validate itemType exists
    const itemType = await prisma.itemType.findUnique({
      where: { id: dto.itemTypeId }
    })
    if (!itemType) {
      throw new BadRequestError({ message: 'Loại hàng không hợp lệ' })
    }

    // Validate category if provided
    if (dto.categoryId) {
      const category = await prisma.category.findFirst({
        where: { id: dto.categoryId, deletedAt: null }
      })
      if (!category) {
        throw new BadRequestError({ message: 'Không tìm thấy danh mục' })
      }
    }

    // Validate unit if provided
    if (dto.unitId) {
      const unit = await prisma.unit.findFirst({
        where: { id: dto.unitId, deletedAt: null }
      })
      if (!unit) {
        throw new BadRequestError({ message: 'Không tìm thấy đơn vị' })
      }
    }

    // Use transaction for composite items with ingredients
    const item = await prisma.$transaction(async (tx) => {
      // Determine code prefix based on item type
      const getPrefixByTypeName = (typeName: string): string => {
        switch (typeName) {
          case 'ready_made': return 'RM'
          case 'composite': return 'CP'
          case 'ingredient': return 'IG'
          default: return 'SP'
        }
      }
      const prefix = getPrefixByTypeName(itemType.name)

      // Calculate avgUnitCost for composite items if ingredients provided
      let calculatedCost: Prisma.Decimal | null = null;
      if (itemType.name === 'composite' && dto.ingredients && dto.ingredients.length > 0) {
          const ingredientIds = dto.ingredients.map(i => i.ingredientItemId);
          const ingredients = await tx.inventoryItem.findMany({
              where: { id: { in: ingredientIds } },
              select: { id: true, avgUnitCost: true }
          });
          
          let totalCost = 0;
          for (const ing of dto.ingredients) {
              const dbIng = ingredients.find(i => i.id === ing.ingredientItemId);
              const unitCost = Number(dbIng?.avgUnitCost || 0);
              totalCost += unitCost * ing.quantity;
          }
          calculatedCost = new Prisma.Decimal(totalCost);
      }

      // Create the main item with temp code
      const newItem = await tx.inventoryItem.create({
        data: {
          code: 'TEMP',
          name: dto.name,
          itemTypeId: dto.itemTypeId,
          categoryId: dto.categoryId,
          unitId: dto.unitId,
          minStock: dto.minStock ? new Prisma.Decimal(dto.minStock) : null,
          maxStock: dto.maxStock ? new Prisma.Decimal(dto.maxStock) : null,
          sellingPrice: dto.sellingPrice ? new Prisma.Decimal(dto.sellingPrice) : null,
          productStatus: dto.productStatus,
          isTopping: dto.isTopping ?? false,
          imageUrl: dto.imageUrl,
          avgUnitCost: calculatedCost // Set calculated cost
        }
      })

      // Update with generated code based on ID
      await tx.inventoryItem.update({
        where: { id: newItem.id },
        data: { code: generateCode(prefix, newItem.id) }
      })

      // Add ingredients if composite item
      if (dto.ingredients && dto.ingredients.length > 0) {
        await tx.itemIngredient.createMany({
          data: dto.ingredients.map(ing => ({
            compositeItemId: newItem.id,
            ingredientItemId: ing.ingredientItemId,
            quantity: new Prisma.Decimal(ing.quantity),
            unit: ing.unit
          }))
        })
      }

      // Add toppings if provided (for products - which toppings can be added)
      if (dto.toppingIds && dto.toppingIds.length > 0) {
        await tx.itemTopping.createMany({
          data: dto.toppingIds.map(toppingId => ({
            productId: newItem.id,
            toppingId: toppingId
          }))
        })
      }

      // Add products if provided (for toppings - which products this topping can be added to)
      if (dto.productIds && dto.productIds.length > 0) {
        await tx.itemTopping.createMany({
          data: dto.productIds.map(productId => ({
            productId: productId,
            toppingId: newItem.id
          }))
        })
      }

      return newItem
    })

    // Update status appropriately (e.g. Critical if stock 0)
    await updateItemStockStatus(item.id)

    // Return with relations
    return this.getItemById(item.id)
  }

  /**
   * Get all items with filters and pagination
   */
  async getAllItems(query: ItemQueryDto) {
    const { page, limit, skip } = parsePagination(query.page, query.limit)

    // Build where conditions
    const where: Prisma.InventoryItemWhereInput = {
      deletedAt: null
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } }
      ]
    }

    // Convert to number since query params come as strings
    if (query.categoryId) {
      where.categoryId = Number(query.categoryId)
    }

    if (query.itemTypeId) {
      where.itemTypeId = Number(query.itemTypeId)
    }

    // Filter theo trạng thái kho (multi-select)
    if (query.stockStatus && query.stockStatus.length > 0) {
      where.status = { in: query.stockStatus }
    }

    // Filter theo trạng thái bán (multi-select)
    if (query.productStatus && query.productStatus.length > 0) {
      where.productStatus = { in: query.productStatus }
    }

    // Filter by isTopping flag
    if (query.isTopping !== undefined) {
      where.isTopping = query.isTopping
    }

    // Exclude ingredients for POS (itemTypeId = 3 is typically 'ingredient')
    if (query.excludeIngredients === true) {
      // Get ingredient itemType ID
      const ingredientType = await prisma.itemType.findFirst({
        where: { name: 'ingredient' }
      })
      if (ingredientType) {
        where.itemTypeId = { not: ingredientType.id }
      }
    }

    // Build orderBy
    const orderBy = query.sort
      ? (Object.entries(query.sort).map(([key, value]) => ({ [key]: value.toLowerCase() })) as any)
      : { createdAt: 'desc' }

    const [items, total] = await Promise.all([
      prisma.inventoryItem.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          category: { select: { id: true, name: true } },
          unit: { select: { id: true, name: true, symbol: true } },
          itemType: { select: { id: true, name: true } },
          _count: {
            select: {
              inventoryBatches: true,
              ingredientOf: true
            }
          },
          ingredientOf: {
          include: {
            ingredientItem: {
              select: { id: true, name: true, avgUnitCost: true, unit: true }
            }
          }
        },
        }
      }),
      prisma.inventoryItem.count({ where })
    ])

    return {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      total,
      items
    }
  }

  /**
   * Get item by ID with full details
   */
  async getItemById(id: number) {
    const item = await prisma.inventoryItem.findFirst({
      where: { id, deletedAt: null },
      include: {
        category: { select: { id: true, name: true } },
        unit: { select: { id: true, name: true, symbol: true } },
        itemType: { select: { id: true, name: true } },
        // Ingredients for composite items (ingredientOf = what this item is made of)
        ingredientOf: {
          include: {
            ingredientItem: {
              select: { id: true, name: true, avgUnitCost: true, unit: true }
            }
          }
        },
        // availableToppings: If this is a product, what toppings can be added
        availableToppings: {
          include: {
            topping: {
              select: { id: true, name: true, sellingPrice: true }
            }
          }
        },
        // applicableProducts: If this is a topping, what products it can be added to
        applicableProducts: {
          include: {
            product: {
              select: { id: true, name: true, sellingPrice: true }
            }
          }
        },
        // Batches for ready-made and ingredients
        inventoryBatches: {
          orderBy: { entryDate: 'desc' },
          include: {
            supplier: { select: { id: true, name: true } }
          }
        }
      }
    })

    if (!item) {
      throw new NotFoundRequestError('Không tìm thấy sản phẩm')
    }

    return item
  }

  /**
   * Update item
   */
  async updateItem(id: number, dto: UpdateItemDto) {
    // Check item exists
    const item = await prisma.inventoryItem.findFirst({
      where: { id, deletedAt: null }
    })

    if (!item) {
      throw new NotFoundRequestError('Không tìm thấy sản phẩm')
    }

    // Check duplicate name if updating name
    if (dto.name && dto.name !== item.name) {
      const existingItem = await prisma.inventoryItem.findFirst({
        where: { 
          name: { equals: dto.name, mode: 'insensitive' },
          deletedAt: null,
          id: { not: id }
        }
      })
      if (existingItem) {
        throw new BadRequestError({ message: `Sản phẩm "${dto.name}" đã tồn tại` })
      }
    }

    // Validate category if provided
    if (dto.categoryId) {
      const category = await prisma.category.findFirst({
        where: { id: dto.categoryId, deletedAt: null }
      })
      if (!category) {
        throw new BadRequestError({ message: 'Không tìm thấy danh mục' })
      }
    }

    // Validate unit if provided
    if (dto.unitId) {
      const unit = await prisma.unit.findFirst({
        where: { id: dto.unitId, deletedAt: null }
      })
      if (!unit) {
        throw new BadRequestError({ message: 'Không tìm thấy đơn vị' })
      }
    }

    // Use transaction for updates with ingredients/toppings
    await prisma.$transaction(async (tx) => {
      // Update main item
      const updateData: Prisma.InventoryItemUpdateInput = {}

      if (dto.name !== undefined) updateData.name = dto.name
      if (dto.itemTypeId !== undefined) updateData.itemType = { connect: { id: dto.itemTypeId } }
      if (dto.categoryId !== undefined) updateData.category = { connect: { id: dto.categoryId } }
      if (dto.unitId !== undefined) updateData.unit = { connect: { id: dto.unitId } }
      if (dto.minStock !== undefined) updateData.minStock = new Prisma.Decimal(dto.minStock)
      if (dto.maxStock !== undefined) updateData.maxStock = new Prisma.Decimal(dto.maxStock)
      if (dto.sellingPrice !== undefined) updateData.sellingPrice = new Prisma.Decimal(dto.sellingPrice)
      if (dto.productStatus !== undefined) updateData.productStatus = dto.productStatus
      if (dto.isTopping !== undefined) updateData.isTopping = dto.isTopping
      if (dto.imageUrl !== undefined) updateData.imageUrl = dto.imageUrl

      // Calculate avgUnitCost if ingredients are being updated
      if (dto.ingredients && dto.ingredients.length > 0) {
          const ingredientIds = dto.ingredients.map(i => i.ingredientItemId);
          const ingredients = await tx.inventoryItem.findMany({
              where: { id: { in: ingredientIds } },
              select: { id: true, avgUnitCost: true }
          });
          
          let totalCost = 0;
          for (const ing of dto.ingredients) {
              const dbIng = ingredients.find(i => i.id === ing.ingredientItemId);
              const unitCost = Number(dbIng?.avgUnitCost || 0);
              totalCost += unitCost * ing.quantity;
          }
          updateData.avgUnitCost = new Prisma.Decimal(totalCost);
      }

      await tx.inventoryItem.update({
        where: { id },
        data: updateData
      })

      // Update ingredients if provided (replace all)
      if (dto.ingredients !== undefined) {
        await tx.itemIngredient.deleteMany({
          where: { compositeItemId: id }
        })

        if (dto.ingredients.length > 0) {
          await tx.itemIngredient.createMany({
            data: dto.ingredients.map(ing => ({
              compositeItemId: id,
              ingredientItemId: ing.ingredientItemId,
              quantity: new Prisma.Decimal(ing.quantity),
              unit: ing.unit
            }))
          })
        }
      }

      // Update toppings if provided (replace all) - for products
      if (dto.toppingIds !== undefined) {
        await tx.itemTopping.deleteMany({
          where: { productId: id }
        })

        if (dto.toppingIds.length > 0) {
          await tx.itemTopping.createMany({
            data: dto.toppingIds.map(toppingId => ({
              productId: id,
              toppingId: toppingId
            }))
          })
        }
      }

      // Update products if provided (replace all) - for toppings
      if (dto.productIds !== undefined) {
        await tx.itemTopping.deleteMany({
          where: { toppingId: id }
        })

        if (dto.productIds.length > 0) {
          await tx.itemTopping.createMany({
            data: dto.productIds.map(productId => ({
              productId: productId,
              toppingId: id
            }))
          })
        }
      }
    })

    return this.getItemById(id)
  }

  /**
   * Delete item (soft delete)
   */
  async deleteItem(id: number) {
    const item = await prisma.inventoryItem.findFirst({
      where: { id, deletedAt: null }
    })

    if (!item) {
      throw new NotFoundRequestError('Không tìm thấy sản phẩm')
    }

    await prisma.inventoryItem.update({
      where: { id },
      data: { deletedAt: new Date() }
    })

    return { message: 'Xóa sản phẩm thành công' }
  }

  /**
   * Batch update prices
   */
  async updatePrices(items: { id: number; price: number }[]) {
    const results = await prisma.$transaction(
      items.map(item =>
        prisma.inventoryItem.update({
          where: { id: item.id },
          data: { sellingPrice: new Prisma.Decimal(item.price) }
        })
      )
    )

    return { updatedCount: results.length }
  }
  /**
   * Get reference data for templates
   */
  async getReferenceData() {
    const [categories, units, itemTypes, ingredients] = await Promise.all([
        prisma.category.findMany({ select: { id: true, name: true }, where: { deletedAt: null } }),
        prisma.unit.findMany({ select: { id: true, name: true }, where: { deletedAt: null } }),
        prisma.itemType.findMany({ select: { id: true, name: true } }),
        prisma.inventoryItem.findMany({ 
            where: { itemType: { name: 'ingredient' }, deletedAt: null },
            select: { id: true, code: true, name: true }
        })
    ]);
    return { categories, units, itemTypes, ingredients };
  }

  /**
   * Import items from Excel
   */
  async importItems(items: any[]) {
      let successCount = 0;
      let errorCount = 0;
      const errors: any[] = [];

      // Pre-fetch caches
      const categories = await prisma.category.findMany({ select: { id: true, name: true } });
      const units = await prisma.unit.findMany({ select: { id: true, name: true } });
      const itemTypes = await prisma.itemType.findMany({ select: { id: true, name: true } });
      
      // Cache for ingredient lookup (code -> id)
      const ingredientMap = new Map<string, number>();
      const allIngredients = await prisma.inventoryItem.findMany({
          where: { itemType: { name: 'ingredient' }, deletedAt: null },
          select: { id: true, code: true }
      });
      allIngredients.forEach(i => ingredientMap.set(i.code, i.id));

      for (const [index, row] of items.entries()) {
          try {
              // Basic Validation
              if (!row.name || !row.type) {
                   throw new Error("Missing required fields: Name, Type");
              }

              // Match Item Type
              // Support Vietnamese names or codes
              let typeName = row.type.toLowerCase();
              if (typeName === 'hàng bán sẵn') typeName = 'ready_made';
              if (typeName === 'hàng cấu thành') typeName = 'composite';
              if (typeName === 'nguyên liệu') typeName = 'ingredient';
              
              const itemType = itemTypes.find(t => t.name.toLowerCase() === typeName || (t.name === 'ready_made' && typeName === 'ready-made'));
              if (!itemType) throw new Error(`Invalid Item Type: ${row.type}`);

              // Match or Create Category
              let categoryId = undefined;
              if (row.category) {
                  categoryId = categories.find(c => c.name.toLowerCase() === row.category.toLowerCase())?.id;
                  if (!categoryId) {
                      const newCat = await prisma.category.create({ data: { name: row.category } });
                      categories.push({ id: newCat.id, name: newCat.name });
                      categoryId = newCat.id;
                  }
              }

              // Match or Create Unit
              let unitId = undefined;
              if (row.unit) {
                  unitId = units.find(u => u.name.toLowerCase() === row.unit.toLowerCase())?.id;
                  if (!unitId) {
                      const newUnit = await prisma.unit.create({ data: { name: row.unit, symbol: row.unit } });
                      units.push({ id: newUnit.id, name: newUnit.name });
                      unitId = newUnit.id;
                  }
              }
              
              // Validate Code/Name Duplication
              if (row.code) {
                  const existing = await prisma.inventoryItem.findFirst({ where: { code: row.code, deletedAt: null } });
                  if (existing) throw new Error(`Duplicate Code: ${row.code}`);
              } else {
                  const existingName = await prisma.inventoryItem.findFirst({ where: { name: { equals: row.name, mode: 'insensitive' }, deletedAt: null } });
                  if (existingName) throw new Error(`Duplicate Name: ${row.name}`);
              }

              // Parse Ingredients for Composite Items
              const ingredientsList: { ingredientItemId: number; quantity: number; unit?: string }[] = [];
              if (itemType.name === 'composite' && row.ingredients) {
                  // Expected format: Code:Qty;Code2:Qty2
                  const parts = row.ingredients.split(';');
                  for (const part of parts) {
                      const [code, qty] = part.split(':').map((s: string) => s.trim());
                      if (code && qty) {
                          const ingId = ingredientMap.get(code);
                          if (!ingId) {
                              // Optional: throw error or skip. Let's warn but continue? No, simpler to throw.
                              throw new Error(`Ingredient code not found: ${code}`);
                          }
                          ingredientsList.push({
                              ingredientItemId: ingId,
                              quantity: Number(qty),
                              unit: '' // Unit usually handled by ingredient's unit, or override.
                          });
                      }
                  }
              }
              
              // Prepare DTO
              const dto: CreateItemDto = {
                  name: row.name,
                  itemTypeId: itemType.id,
                  categoryId: categoryId,
                  unitId: unitId,
                  minStock: Number(row.minStock) || 0,
                  maxStock: Number(row.maxStock) || 0,
                  sellingPrice: Number(row.sellingPrice) || 0,
                  productStatus: 'selling' as any,
                  isTopping: false, // Default
                  imageUrl: '',
                  ingredients: ingredientsList,
                  toppingIds: [],
                  productIds: []
              };
              
              await this.createItem(dto);
              
              // If code was provided, we might need to update it? 
              // unique check passed, but createItem generates code. 
              // If user provided code, we should probably use it.
              // Current createItem generates a TEMP code then updates it.
              // To support custom code, I'd need to modify createItem or update it here.
              // Modifying createItem is safer. However, createItem uses prefix+ID.
              // If I want to support importing custom code:
              if (row.code) {
                   // Find the created item (by name)
                   const created = await prisma.inventoryItem.findFirst({ where: { name: dto.name, deletedAt: null }, orderBy: { id: 'desc' } });
                   if (created) {
                       await prisma.inventoryItem.update({
                           where: { id: created.id },
                           data: { code: row.code }
                       });
                   }
              }

              successCount++;
          } catch (err: any) {
              errorCount++;
              errors.push({ row: index + 2, error: err.message, data: row });
          }
      }

      return {
          success: true,
          total: items.length,
          successCount,
          errorCount,
          errors
      };
  }
}

export const inventoryItemService = new InventoryItemService()
