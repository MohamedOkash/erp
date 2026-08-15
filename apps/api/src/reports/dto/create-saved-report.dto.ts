import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateSavedReportDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  reportType: string;

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
