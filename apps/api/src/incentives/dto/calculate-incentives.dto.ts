import {
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
} from 'class-validator';

export class CalculateIncentivesDto {
  @IsDateString()
  @IsOptional()
  fromDate?: string;

  @IsDateString()
  @IsOptional()
  toDate?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  employeeIds?: string[];
}
