import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class UpdateRolePermissionsDto {
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  permissionIds: string[];
}
