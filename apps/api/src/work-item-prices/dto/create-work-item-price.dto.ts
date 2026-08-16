import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateWorkItemPriceDto {
  @IsString()
  @IsOptional()
  branchId?: string;

  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  contractPrice: number;

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
