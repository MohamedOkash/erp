import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'اسم المستخدم يجب أن يتكون من 3 أحرف على الأقل' })
  username?: string;

  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'الاسم الكامل مطلوب' })
  fullName?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
