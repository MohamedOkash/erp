import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class QueryCrewDto {
  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  @IsIn(['A', 'B'])
  crewType?: 'A' | 'B';

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  workAreaId?: string;
}
