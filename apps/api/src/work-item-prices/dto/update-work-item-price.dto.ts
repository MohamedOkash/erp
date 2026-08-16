import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateWorkItemPriceDto {
  @IsString()
  @IsOptional()
  branchId?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  contractPrice?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  materialPrice?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  laborRateSkilled?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  laborRateUnskilled?: number;

  @IsString()
  @IsOptional()
  effectiveFrom?: string;
}
