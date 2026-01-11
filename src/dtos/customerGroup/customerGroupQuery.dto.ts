import { IsOptional, IsString, IsInt, Min } from 'class-validator'

export class CustomerGroupQueryDto {
    @IsOptional()
    @IsString()
    search?: string

    @IsOptional()
    sort?: Record<string, 'ASC' | 'DESC'>

    @IsOptional()
    @IsInt()
    @Min(1)
    limit?: number

    @IsOptional()
    @IsInt()
    @Min(1)
    page?: number
}
