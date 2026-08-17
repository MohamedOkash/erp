import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateWorkItemDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  unitId?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  defaultUnitRate?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  defaultDailyTarget?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  branchId?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  customUnitRate?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  customDailyTarget?: number;
}
