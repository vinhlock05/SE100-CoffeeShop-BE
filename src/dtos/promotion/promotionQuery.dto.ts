import { IsOptional, IsInt, IsString, IsBoolean, Min } from 'class-validator'

export class PromotionQueryDto {
    @IsOptional()
    @IsInt()
    @Min(1)
    page?: number

    @IsOptional()
    @IsInt()
    @Min(1)
    limit?: number

    @IsOptional()
    @IsString()
    search?: string

    @IsOptional()
    @IsBoolean()
    isActive?: boolean

    @IsOptional()
    @IsInt()
    typeId?: number

    sort?: any  // Parsed by middleware
}
