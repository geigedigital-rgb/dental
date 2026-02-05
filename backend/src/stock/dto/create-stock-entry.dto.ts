import { IsString, IsDateString, IsOptional, IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { StockEntryItemDto } from './stock-entry-item.dto';

export class CreateStockEntryDto {
  @IsString()
  supplierId: string;

  @IsDateString()
  entryDate: string;

  @IsOptional()
  @IsString()
  note?: string;

  /** Оплата доставки (грн), может отсутствовать */
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  deliveryCost?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StockEntryItemDto)
  items: StockEntryItemDto[];
}
