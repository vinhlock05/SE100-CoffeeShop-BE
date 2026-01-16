import { IsString, IsInt, IsOptional, IsNumber, IsDateString, IsBoolean, IsArray, Min } from 'class-validator'

export class CreatePromotionDto {
    @IsString()
    name: string

    @IsOptional()
    @IsString()
    description?: string

    @IsInt()
    typeId: number

    // KM theo phần trăm, theo số tiền, đồng giá
    @IsOptional()
    @IsNumber()
    @Min(0)
    discountValue?: number

    // KM theo phần trăm, theo số tiền, đồng giá, tặng món
    @IsOptional()
    @IsNumber()
    @Min(0)
    minOrderValue?: number

    // KM theo phần trăm, theo số tiền, đồng giá
    @IsOptional()
    @IsNumber()
    @Min(0)
    maxDiscount?: number

    // Khuyến mãi tặng món
    @IsOptional()
    @IsInt()
    @Min(1)
    buyQuantity?: number

    @IsOptional()
    @IsInt()
    @Min(1)
    getQuantity?: number

    @IsOptional()
    @IsBoolean()
    requireSameItem?: boolean

    // chung
    @IsOptional()
    @IsDateString()
    startDateTime?: string

    @IsOptional()
    @IsDateString()
    endDateTime?: string

    @IsOptional()
    @IsInt()
    @Min(1)
    maxTotalUsage?: number

    @IsOptional()
    @IsInt()
    @Min(1)
    maxUsagePerCustomer?: number

    @IsOptional()
    @IsBoolean()
    isActive?: boolean

    // Applicable scope
    @IsOptional()
    @IsArray()
    @IsInt({ each: true })
    applicableItemIds?: number[]

    @IsOptional()
    @IsArray()
    @IsInt({ each: true })
    applicableCategoryIds?: number[]

    @IsOptional()
    @IsArray()
    @IsInt({ each: true })
    applicableComboIds?: number[]

    @IsOptional()
    @IsArray()
    @IsInt({ each: true })
    applicableCustomerIds?: number[]

    @IsOptional()
    @IsArray()
    @IsInt({ each: true })
    applicableCustomerGroupIds?: number[]

    // Explicit flags for "ALL" scopes
    @IsOptional()
    @IsBoolean()
    applyToAllItems?: boolean

    @IsOptional()
    @IsBoolean()
    applyToAllCategories?: boolean

    @IsOptional()
    @IsBoolean()
    applyToAllCombos?: boolean

    @IsOptional()
    @IsBoolean()
    applyToAllCustomers?: boolean

    @IsOptional()
    @IsBoolean()
    applyToAllCustomerGroups?: boolean

    @IsOptional()
    @IsBoolean()
    applyToWalkIn?: boolean

    @IsOptional()
    @IsArray()
    @IsInt({ each: true })
    giftItemIds?: number[]
}
