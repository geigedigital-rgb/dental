import { IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ServiceMaterialDto {
  @IsString()
  materialId: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  quantity: number;
}
