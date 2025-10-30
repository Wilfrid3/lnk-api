// src/controllers/admin/adult-services-admin.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
// import { AdminGuard } from '../guards/admin.guard';
import { AdultServicesService } from '../services/adult-services.service';

@ApiTags('Admin - Adult Services')
@Controller('admin/services')
// @UseGuards(AdminGuard)
@ApiBearerAuth()
export class AdultServicesAdminController {
  constructor(private readonly adultServicesService: AdultServicesService) {}

  @Get()
  async getAllServices() {
    return this.adultServicesService.getAllServices();
  }

  @Post()
  async createService(@Body() serviceData: any) {
    return this.adultServicesService.createService(serviceData);
  }

  @Put(':serviceId')
  async updateService(
    @Param('serviceId') serviceId: string,
    @Body() updateData: any,
  ) {
    return this.adultServicesService.updateService(serviceId, updateData);
  }

  @Put(':serviceId/toggle')
  async toggleServiceStatus(@Param('serviceId') serviceId: string) {
    return this.adultServicesService.toggleServiceStatus(serviceId);
  }
}
