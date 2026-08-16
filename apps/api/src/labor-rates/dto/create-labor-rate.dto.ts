import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateLaborRateDto {
  @IsString()
  @IsNotEmpty()
  rateType: string;

  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  hourlyRate: number;

  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  dailyRate: number;

  @IsString()
  @IsOptional()
  effectiveFrom?: string;
}
