import { IsNotEmpty, IsOptional, IsString, IsObject } from 'class-validator';

export class UpdateCompanySettingItemDto {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsString()
  @IsNotEmpty()
  value: string;

  @IsString()
  @IsOptional()
  displayNameAr?: string;

  @IsString()
  @IsOptional()
  descriptionAr?: string;
}

export class UpdateCompanySettingsDto {
  @IsObject()
  @IsNotEmpty()
  settings: Record<string, string | number>;
}
