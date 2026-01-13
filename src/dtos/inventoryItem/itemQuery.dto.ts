import { IsOptional, IsString, IsNumber, IsEnum, IsArray } from 'class-validator'
import { Type, Transform } from 'class-transformer'
import { InventorySaleStatus, InventoryStockStatus } from '~/enums'

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc'
}

/**
 * Query DTO cho lấy danh sách sản phẩm
 * Hỗ trợ filter theo:
 * - stockStatus: Trạng thái kho (multi-select)
 * - productStatus: Trạng thái bán (multi-select)
 */
export class ItemQueryDto {
  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  categoryId?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  itemTypeId?: number

  // Filter theo trạng thái kho (hỗ trợ nhiều giá trị, phân cách bởi dấu phẩy)
  // VD: ?stockStatus=good,low hoặc ?stockStatus=good&stockStatus=low
  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value
    if (typeof value === 'string') return value.split(',')
    return [value]
  })
  @IsArray()
  @IsEnum(InventoryStockStatus, { each: true })
  stockStatus?: InventoryStockStatus[]

  // Filter theo trạng thái bán (hỗ trợ nhiều giá trị)
  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value
    if (typeof value === 'string') return value.split(',')
    return [value]
  })
  @IsArray()
  @IsEnum(InventorySaleStatus, { each: true })
  productStatus?: InventorySaleStatus[]

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number

  @IsOptional()
  @IsString()
  sortBy?: string

  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder
}
