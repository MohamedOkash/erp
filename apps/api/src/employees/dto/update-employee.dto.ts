import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateEmployeeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  nationalId?: string;

  @IsOptional()
  @IsString()
  identityNumber?: string;

  @IsOptional()
  @IsString()
  identityType?: string;

  @IsOptional()
  @IsString()
  roleType?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  dailyWage?: number;

  @IsOptional()
  @IsString()
  primaryBranchId?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
