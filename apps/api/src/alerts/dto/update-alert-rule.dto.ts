import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateAlertRuleDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsOptional()
  condition?: any;

  @IsNumber()
  @IsOptional()
  threshold?: number;

  @IsOptional()
  scope?: any;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  notificationUserIds?: string[];

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}
