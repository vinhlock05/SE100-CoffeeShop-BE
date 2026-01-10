import { IsOptional, IsString } from 'class-validator'

export class CheckOutDto {
  @IsString()
  @IsOptional()
  note?: string
}
