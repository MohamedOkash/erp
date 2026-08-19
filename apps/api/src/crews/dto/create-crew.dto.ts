import { IsArray, IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CrewMemberItemDto {
  @IsNotEmpty()
  @IsString()
  employeeId: string;

  @IsNotEmpty()
  @IsString()
  @IsIn(['skilled_1', 'skilled_2', 'helper'])
  role: 'skilled_1' | 'skilled_2' | 'helper';
}

export class CreateCrewDto {
  @IsNotEmpty()
  @IsString()
  projectId: string;

  @IsNotEmpty()
  @IsString()
  code: string;

  @IsNotEmpty()
  @IsString()
  @IsIn(['A', 'B'])
  crewType: 'A' | 'B';

  @IsOptional()
  @IsString()
  workAreaId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CrewMemberItemDto)
  members?: CrewMemberItemDto[];
}
