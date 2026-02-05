import { IsString, IsDateString, IsNumber, IsOptional, Min, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class MaterialAmountDto {
  @IsString()
  materialId: string;

  /** Количество единиц материала на одну услугу (для списания со склада) */
  @Min(0)
  @IsNumber()
  @Type(() => Number)
  quantity: number;

  /** Назначенная сумма на этот материал в распределении (грн), всего */
  @Min(0)
  @IsNumber()
  @Type(() => Number)
  amount: number;
}

export class CreateServiceSaleDto {
  @IsString()
  serviceId: string;

  @IsDateString()
  saleDate: string;

  /** Общая сумма продажи (грн) */
  @Min(0)
  @IsNumber()
  @Type(() => Number)
  totalPrice: number;

  /** Услуга стоматолога — часть общей суммы (грн) */
  @Min(0)
  @IsNumber()
  @Type(() => Number)
  laborAmount: number;

  /** Материалы: quantity (на одну услугу для списания), amount (назначенная сумма в грн). Можно добавлять материалы вне состава услуги. */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MaterialAmountDto)
  materialAmounts: MaterialAmountDto[];

  @IsOptional()
  @IsString()
  note?: string;
}
