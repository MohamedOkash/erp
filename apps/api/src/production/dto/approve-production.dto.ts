import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class ApproveProductionDto {
  @IsNotEmpty()
  @IsString()
  @IsIn(['supervisor', 'engineer', 'final'])
  step: 'supervisor' | 'engineer' | 'final';
}
