import { IsString, IsNotEmpty, IsOptional, IsInt, Min, IsBoolean, IsIn } from 'class-validator'
import { TableStatus } from '~/enums'

export class CreateTableDto {
    @IsString()
    @IsNotEmpty({ message: 'Table name is required' })
    tableName!: string

    @IsOptional()
    @IsInt()
    areaId?: number

    @IsOptional()
    @IsInt()
    @Min(1)
    capacity?: number

    @IsOptional()
    @IsBoolean()
    isActive?: boolean

    @IsOptional()
    @IsString()
    @IsIn(Object.values(TableStatus), { message: 'Current status must be available or occupied' })
    currentStatus?: TableStatus
}
