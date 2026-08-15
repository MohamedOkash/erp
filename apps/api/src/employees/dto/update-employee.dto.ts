import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

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
  @IsIn(['national_id', 'iqama', 'passport'])
  identityType?: 'national_id' | 'iqama' | 'passport';

  @IsOptional()
  @IsDateString()
  identityExpiryDate?: string;

  @IsOptional()
  @IsString()
  nationality?: string;

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
