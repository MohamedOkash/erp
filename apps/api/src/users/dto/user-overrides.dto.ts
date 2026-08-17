import { IsArray, IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class PermissionOverrideItemDto {
  @IsString()
  @IsOptional()
  permissionId?: string;

  @IsString()
  @IsOptional()
  permissionCode?: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['grant', 'deny'])
  grantType: 'grant' | 'deny';
}

export class UpdateUserOverridesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionOverrideItemDto)
  overrides: PermissionOverrideItemDto[];
}
