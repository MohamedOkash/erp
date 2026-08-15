import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateSavedReportDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  reportType?: string;

  @IsOptional()
  filters?: any;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  columns?: string[];

  @IsBoolean()
  @IsOptional()
  isShared?: boolean;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  sharedUserIds?: string[];
}
