import { IsOptional, IsString, IsNumber, IsBoolean, IsEnum } from 'class-validator'
import { Gender } from '~/enums'

export class CustomerQueryDto {
    @IsOptional()
    @IsString()
    search?: string

    @IsOptional()
    @IsNumber()
    groupId?: number

    @IsOptional()
    @IsBoolean()
    isActive?: boolean

    @IsOptional()
    @IsEnum(Gender)
    gender?: Gender

    @IsOptional()
    @IsString()
    city?: string

    @IsOptional()
    sort?: Record<string, 'ASC' | 'DESC'>

    @IsOptional()
    @IsNumber()
    page?: number

    @IsOptional()
    @IsNumber()
    limit?: number
}
