import { IsArray, IsBoolean, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CrewMemberItemDto {
  @IsNotEmpty()
  @IsString()
  employeeId: string;

  @IsNotEmpty()
  @IsString()
  @IsIn(['skilled_1', 'skilled_2', 'helper', 'maallem', 'labor'])
  role: 'skilled_1' | 'skilled_2' | 'helper' | 'maallem' | 'labor';
}

export class CreateCrewTemplateDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  code: string;

  @IsNotEmpty()
  @IsNumber()
  skilledCount: number;

  @IsNotEmpty()
  @IsNumber()
  unskilledCount: number;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateCrewDto {
  @IsNotEmpty()
  @IsString()
  projectId: string;

  @IsNotEmpty()
  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  crewType?: string;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsString()
  foremanId?: string;

  @IsOptional()
  @IsString()
  crewNumber?: string;

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
