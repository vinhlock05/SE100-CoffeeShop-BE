import { IsOptional, IsString, IsInt, IsDateString, IsBoolean, IsEnum } from 'class-validator'
import { Gender } from '~/enums'

export class CreateCustomerDto {
    @IsString()
    name: string

    @IsOptional()
    @IsEnum(Gender)
    gender?: Gender

    @IsOptional()
    @IsDateString()
    birthday?: string

    @IsString()
    phone: string

    @IsOptional()
    @IsString()
    address?: string

    @IsOptional()
    @IsString()
    city?: string

    @IsOptional()
    @IsInt()
    groupId?: number

    @IsOptional()
    @IsBoolean()
    isActive?: boolean
}
