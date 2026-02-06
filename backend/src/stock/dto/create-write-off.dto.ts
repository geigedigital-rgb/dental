import { IsString, IsDateString, IsNumber, Min, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateWriteOffDto {
  @IsString()
  materialId: string;

  /** При указании списание идёт с конкретной партии (поставщика), иначе по FIFO/средней */
  @IsOptional()
  @IsString()
  materialLotId?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  quantity: number;

  @IsString()
  reason: string;

  @IsDateString()
  writeOffDate: string;
}
