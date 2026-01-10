import { IsString, IsNotEmpty } from 'class-validator'

export class CreateAreaDto {
    @IsString()
    @IsNotEmpty({ message: 'Area name is required' })
    name!: string
}
