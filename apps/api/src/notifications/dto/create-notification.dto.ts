import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateNotificationDto {
  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  message?: string;

  @IsOptional()
  metadata?: any;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  userIds?: string[];
}
