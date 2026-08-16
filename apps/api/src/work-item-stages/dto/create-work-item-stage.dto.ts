import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateWorkItemStageDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsNumber()
  @Min(0)
  @Max(1)
  percentage: number;

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
