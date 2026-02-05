import { IsOptional, IsIn, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class InventorySettingsDto {
  @IsOptional()
  @IsIn(['FIFO', 'AVERAGE'])
  writeOffMethod?: 'FIFO' | 'AVERAGE';

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  lotTracking?: boolean;

  @IsOptional()
  @IsIn(['FEFO', 'NONE'])
  expiryRule?: 'FEFO' | 'NONE';
}
