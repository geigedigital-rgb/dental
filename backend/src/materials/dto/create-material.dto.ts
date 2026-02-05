import { IsString, IsNumber, IsBoolean, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMaterialDto {
  @IsString()
  materialTypeId: string;

  @IsString()
  name: string;

  @IsString()
  unit: string;

  /** Ед. закупки (как приходит в накладной): Коробка (50), Флакон, Шприц. Если не указано — как unit */
  @IsOptional()
  @IsString()
  purchaseUnit?: string;

  /** Сколько ед. учета (unit) в 1 ед. закупки. 50 = 1 коробка → 50 карпул */
  @IsOptional()
  @IsNumber()
  @Min(0.0001)
  @Type(() => Number)
  purchaseUnitRatio?: number;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minStockThreshold?: number;

  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;
}
