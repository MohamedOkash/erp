import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateEmployeeDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  nationalId?: string;

  @IsOptional()
  @IsString()
  identityNumber?: string;

  @IsOptional()
  @IsString()
  @IsIn(['national_id', 'iqama', 'passport'])
  identityType?: 'national_id' | 'iqama' | 'passport' = 'national_id';

  @IsOptional()
  @IsDateString()
  identityExpiryDate?: string;

  @IsOptional()
  @IsString()
  nationality?: string;

  @IsNotEmpty()
  @IsString()
  roleType: string;

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
}
