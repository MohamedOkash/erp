import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateCorrectionDto {
  @IsNotEmpty()
  @IsString()
  @IsIn(['quantity_adjust', 'annul', 'note'])
  type: 'quantity_adjust' | 'annul' | 'note';

  @IsOptional()
  @IsNumber()
  delta?: number;

  @IsNotEmpty()
  @IsString()
  reason: string;
}
