import { IsOptional, IsString } from 'class-validator';

export class RejectTransferDto {
  @IsString()
  @IsOptional()
  rejectionReason?: string;
}
