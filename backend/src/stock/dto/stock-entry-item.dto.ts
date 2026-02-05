import { IsString, Min, IsOptional, IsDateString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class StockEntryItemDto {
  @IsString()
  materialId: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  quantity: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice: number;

  /** Срок годности партии (для FEFO) */
  @IsOptional()
  @IsDateString()
  expiryDate?: string;
}
