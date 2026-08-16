import { IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateStagingRowDto {
  @IsOptional()
  @IsObject()
  parsedData?: Record<string, any>;

  @IsOptional()
  @IsString()
  status?: string;
}
