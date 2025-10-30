import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument, ServicePackage } from '../schemas/user.schema';
import { CreateServicePackageDto } from '../dto/create-service-package.dto';
import { UpdateServicePackageDto } from '../dto/update-service-package.dto';
import { AdultServicesService } from '../../modules/adult-services/services/adult-services.service';

@Injectable()
export class UserServicePackageService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly adultServicesService: AdultServicesService,
  ) {}

  async getUserPackages(userId: string): Promise<ServicePackage[]> {
    const user = await this.userModel.findById(userId).lean();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user.servicePackages || [];
  }

  async createPackage(
    userId: string,
    createPackageDto: CreateServicePackageDto,
  ): Promise<ServicePackage> {
    // Validate service IDs
    await this.validateServiceIds(createPackageDto.services);

    // Check for duplicate services
    this.checkDuplicateServices(createPackageDto.services);

    const packageId = new Types.ObjectId().toString();
    const newPackage: ServicePackage = {
      _id: packageId,
      title: createPackageDto.title,
      services: createPackageDto.services,
      price: createPackageDto.price,
      currency: createPackageDto.currency || 'FCFA',
      duration: createPackageDto.duration,
      description: createPackageDto.description,
      isActive:
        createPackageDto.isActive !== undefined
          ? createPackageDto.isActive
          : true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedUser = await this.userModel.findByIdAndUpdate(
      userId,
      { $push: { servicePackages: newPackage } },
      { new: true, runValidators: true },
    );

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    return newPackage;
  }

  async updatePackage(
    userId: string,
    packageId: string,
    updatePackageDto: UpdateServicePackageDto,
  ): Promise<ServicePackage> {
    // Find user and verify package exists
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const packageIndex = user.servicePackages?.findIndex(
      (pkg) => pkg._id === packageId,
    );
    if (
      packageIndex === -1 ||
      packageIndex === undefined ||
      !user.servicePackages
    ) {
      throw new NotFoundException('Package not found');
    }

    // Validate service IDs if services are being updated
    if (updatePackageDto.services) {
      await this.validateServiceIds(updatePackageDto.services);
      this.checkDuplicateServices(updatePackageDto.services);
    }

    // Update the package
    const updatedPackage = {
      ...user.servicePackages[packageIndex],
      ...updatePackageDto,
      updatedAt: new Date(),
    };

    // Update the user document
    const updatedUser = await this.userModel.findByIdAndUpdate(
      userId,
      { $set: { [`servicePackages.${packageIndex}`]: updatedPackage } },
      { new: true, runValidators: true },
    );

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    return updatedPackage;
  }

  async deletePackage(userId: string, packageId: string): Promise<void> {
    const result = await this.userModel.findByIdAndUpdate(
      userId,
      { $pull: { servicePackages: { _id: packageId } } },
      { new: true },
    );

    if (!result) {
      throw new NotFoundException('User not found');
    }

    // Check if package was actually removed
    const packageExists = result.servicePackages?.some(
      (pkg) => pkg._id === packageId,
    );
    if (packageExists) {
      throw new NotFoundException('Package not found');
    }
  }

  private async validateServiceIds(serviceIds: string[]): Promise<void> {
    const invalidIds =
      await this.adultServicesService.getInvalidServiceIds(serviceIds);
    if (invalidIds.length > 0) {
      throw new BadRequestException(
        `Invalid service IDs: ${invalidIds.join(', ')}. Please check that these services exist and are active.`,
      );
    }
  }

  private checkDuplicateServices(services: string[]): void {
    const duplicates = services.filter(
      (service, index) => services.indexOf(service) !== index,
    );
    if (duplicates.length > 0) {
      throw new BadRequestException(
        `Duplicate services found: ${duplicates.join(', ')}. Each service can only be included once per package.`,
      );
    }
  }
}
