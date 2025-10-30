// src/services/adult-services.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AdultService } from '../schemas/adult-service.schema';
import { ServiceCategory } from '../schemas/service-category.schema';

@Injectable()
export class AdultServicesService {
  constructor(
    @InjectModel(AdultService.name)
    private adultServiceModel: Model<AdultService>,
    @InjectModel(ServiceCategory.name)
    private serviceCategoryModel: Model<ServiceCategory>,
  ) {}

  async getAllServices() {
    return this.adultServiceModel
      .find({ isActive: true })
      .sort({ sortOrder: 1 });
  }

  async getServicesByCategory(categoryId: string) {
    return this.adultServiceModel
      .find({
        category: categoryId,
        isActive: true,
      })
      .sort({ sortOrder: 1 });
  }

  async getAllCategories() {
    return this.serviceCategoryModel
      .find({ isActive: true })
      .sort({ sortOrder: 1 });
  }

  async validateServiceIds(serviceIds: string[]): Promise<boolean> {
    const validServices = await this.adultServiceModel.find({
      id: { $in: serviceIds },
      isActive: true,
    });

    return validServices.length === serviceIds.length;
  }

  async getInvalidServiceIds(serviceIds: string[]): Promise<string[]> {
    const validServices = await this.adultServiceModel.find({
      id: { $in: serviceIds },
      isActive: true,
    });

    const validIds = validServices.map((service) => service.id);
    return serviceIds.filter((id) => !validIds.includes(id));
  }

  // Admin methods
  async createService(serviceData: Partial<AdultService>) {
    const service = new this.adultServiceModel(serviceData);
    return service.save();
  }

  async updateService(serviceId: string, updateData: Partial<AdultService>) {
    return this.adultServiceModel.findOneAndUpdate(
      { id: serviceId },
      updateData,
      { new: true },
    );
  }

  async toggleServiceStatus(serviceId: string) {
    const service = await this.adultServiceModel.findOne({ id: serviceId });
    if (!service) {
      throw new BadRequestException('Service not found');
    }

    service.isActive = !service.isActive;
    return service.save();
  }
}
