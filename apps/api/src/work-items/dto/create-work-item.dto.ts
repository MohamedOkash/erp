import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateWorkItemDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  unitId?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  defaultUnitRate?: number = 0;

  @IsNumber()
  @Min(0)
  @IsOptional()
  defaultDailyTarget?: number = 0;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;

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
