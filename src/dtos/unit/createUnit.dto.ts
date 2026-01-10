import { IsString, IsNotEmpty } from 'class-validator'

export class CreateUnitDto {
  @IsString()
  @IsNotEmpty({ message: 'Unit name is required' })
  name!: string

  @IsString()
  @IsNotEmpty({ message: 'Unit symbol is required' })
  symbol!: string
}
