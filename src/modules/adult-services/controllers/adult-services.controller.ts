// src/controllers/adult-services.controller.ts
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AdultServicesService } from '../services/adult-services.service';
import { Public } from 'src/common/decorators/public.decorator';

@ApiTags('Adult Services')
@Public()
@Controller('services')
export class AdultServicesController {
  constructor(private readonly adultServicesService: AdultServicesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all available adult services' })
  async getAllServices() {
    const [services, categories] = await Promise.all([
      this.adultServicesService.getAllServices(),
      this.adultServicesService.getAllCategories(),
    ]);

    return { services, categories };
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get service categories' })
  async getCategories() {
    return this.adultServicesService.getAllCategories();
  }

  @Get('category/:categoryId')
  @ApiOperation({ summary: 'Get services by category' })
  async getServicesByCategory(@Param('categoryId') categoryId: string) {
    const services =
      await this.adultServicesService.getServicesByCategory(categoryId);
    return { services };
  }
}
