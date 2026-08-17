import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsNotEmpty({ message: 'كلمة المرور الحالية مطلوبة' })
  @IsString()
  currentPassword!: string;

  @IsNotEmpty({ message: 'كلمة المرور الجديدة مطلوبة' })
  @IsString()
  @MinLength(8, { message: 'كلمة المرور الجديدة يجب أن لا تقل عن 8 أحرف' })
  newPassword!: string;
}
