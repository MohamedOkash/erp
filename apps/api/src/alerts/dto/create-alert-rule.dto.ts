import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateAlertRuleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  type: string;

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
  enabled?: boolean = true;
}
