import { IsString, IsDateString, IsOptional } from 'class-validator';

export class UpdateWriteOffDto {
  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsDateString()
  writeOffDate?: string;
}
