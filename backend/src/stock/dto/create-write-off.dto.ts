import { IsString, IsDateString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateWriteOffDto {
  @IsString()
  materialId: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  quantity: number;

  @IsString()
  reason: string;

  @IsDateString()
  writeOffDate: string;
}
