import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UserScopeDto } from './create-user.dto';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  employeeId?: string;

  @IsString()
  @IsOptional()
  fullName?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  roleCodes?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserScopeDto)
  @IsOptional()
  scopes?: UserScopeDto[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
