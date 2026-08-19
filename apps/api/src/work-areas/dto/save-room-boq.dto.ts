import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class SaveRoomBoqDto {
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @IsNotEmpty()
  workItemId: string;

  @IsString()
  @IsOptional()
  workItemStageId?: string;

  @IsNumber()
  @Min(0)
  totalQuantity: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  unitRate?: number = 0;

  @IsString()
  @IsOptional()
  unitId?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
