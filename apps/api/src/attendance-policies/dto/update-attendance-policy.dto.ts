import {
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
} from 'class-validator';

export class UpdateAttendancePolicyDto {
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/, {
    message: 'shiftStartTime must be in HH:MM format',
  })
  shiftStartTime?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/, {
    message: 'shiftEndTime must be in HH:MM format',
  })
  shiftEndTime?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  graceMinutes?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  breakMinutes?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  overtimeThresholdHours?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  overtimeMultiplier?: number;

  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
