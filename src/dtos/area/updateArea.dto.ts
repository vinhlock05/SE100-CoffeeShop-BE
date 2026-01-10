import { IsString, IsNotEmpty } from 'class-validator'

export class UpdateAreaDto {
    @IsString()
    @IsNotEmpty({ message: 'Area name is required' })
    name!: string
}
