import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ApproveProductionDto {
  @IsNotEmpty()
  @IsString()
  @IsIn(['submit', 'supervisor', 'engineer', 'final'])
  step: 'submit' | 'supervisor' | 'engineer' | 'final';

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  engineerApprovedBy?: string;
}
