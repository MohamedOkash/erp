import { IsBoolean, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateWorkItemStageDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  percentage?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  standardProductivity?: number;

  @IsString()
  @IsOptional()
  unitId?: string;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
