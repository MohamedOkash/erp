import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RequestTransferDto {
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @IsString()
  @IsOptional()
  fromProjectId?: string;

  @IsString()
  @IsOptional()
  fromAreaId?: string;

  @IsString()
  @IsNotEmpty()
  toProjectId: string;

  @IsString()
  @IsOptional()
  toAreaId?: string;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsIn(['normal', 'urgent'])
  @IsOptional()
  urgency?: string;

  @IsString()
  @IsOptional()
  transferDate?: string;
}
