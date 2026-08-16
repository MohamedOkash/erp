import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateLaborRateDto {
  @IsString()
  @IsOptional()
  rateType?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  hourlyRate?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  dailyRate?: number;

  @IsString()
  @IsOptional()
  effectiveFrom?: string;
}
