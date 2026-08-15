import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateIncentiveRuleDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  thresholdPercentage?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  rewardAmount?: number;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}
