import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateIncentiveRuleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  thresholdPercentage: number;

  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  rewardAmount: number;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean = true;
}
