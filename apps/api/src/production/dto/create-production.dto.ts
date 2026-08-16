import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ProductionWorkerItemDto {
  @IsNotEmpty()
  @IsString()
  employeeId: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  individualQuantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  hoursWorked?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  overtimeHours?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  bonusPercentage?: number;

  @IsOptional()
  @IsString()
  skillLevel?: string;

  @IsOptional()
  @IsString()
  workerType?: 'individual' | 'team';

  @IsOptional()
  @IsBoolean()
  isEstimated?: boolean;
}

export class CreateProductionDto {
  @IsNotEmpty()
  @IsString()
  date: string;

  @IsNotEmpty()
  @IsString()
  branchId: string;

  @IsNotEmpty()
  @IsString()
  projectId: string;

  @IsNotEmpty()
  @IsString()
  workItemId: string;

  @IsOptional()
  @IsString()
  workItemStageId?: string;

  @IsOptional()
  @IsString()
  workAreaId?: string;

  @IsNotEmpty()
  @IsString()
  supervisorId: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  targetQuantity?: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  actualQuantity: number;

  @IsNotEmpty()
  @IsString()
  @IsIn(['individual', 'team', 'mixed'])
  productionType: 'individual' | 'team' | 'mixed';

  @IsOptional()
  @IsString()
  teamCode?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductionWorkerItemDto)
  workers: ProductionWorkerItemDto[];
}
