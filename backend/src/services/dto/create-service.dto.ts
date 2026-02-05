import { IsString, IsOptional, IsNumber, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ServiceMaterialDto } from './service-material.dto';

export class CreateServiceDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  basePrice?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceMaterialDto)
  materials: ServiceMaterialDto[];
}
