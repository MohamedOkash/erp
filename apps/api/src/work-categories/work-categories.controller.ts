import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { WorkCategoriesService } from './work-categories.service';
import { CreateWorkCategoryDto } from './dto/create-work-category.dto';
import { UpdateWorkCategoryDto } from './dto/update-work-category.dto';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.service';

@Controller('work-categories')
@UseGuards(SessionAuthGuard)
export class WorkCategoriesController {
  constructor(private readonly categoriesService: WorkCategoriesService) {}

  @Get()
  async listCategories(@CurrentUser() user: AuthenticatedUser) {
    return this.categoriesService.listCategories(user.companyId);
  }

  @Get(':id')
  async getCategory(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.categoriesService.getCategoryById(user.companyId, id);
  }

  @Post()
  async createCategory(
    @Body() dto: CreateWorkCategoryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.categoriesService.createCategory(user.companyId, dto);
  }

  @Patch(':id')
  async updateCategory(
    @Param('id') id: string,
    @Body() dto: UpdateWorkCategoryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.categoriesService.updateCategory(user.companyId, id, dto);
  }

  @Delete(':id')
  async deleteCategory(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.categoriesService.deleteCategory(user.companyId, id);
  }
}
