import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class ApproveProductionDto {
  @IsNotEmpty()
  @IsString()
  @IsIn(['submit', 'supervisor', 'engineer', 'final'])
  step: 'submit' | 'supervisor' | 'engineer' | 'final';
}
