// src/modules/adult-services/adult-services.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  AdultService,
  AdultServiceSchema,
} from './schemas/adult-service.schema';
import {
  ServiceCategory,
  ServiceCategorySchema,
} from './schemas/service-category.schema';
import { AdultServicesSeeder } from './seeders/adult-services.seeder';
import { AdultServicesService } from './services/adult-services.service';
import { AdultServicesController } from './controllers/adult-services.controller';
import { AdultServicesAdminController } from './controllers/adult-services-admin.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AdultService.name, schema: AdultServiceSchema },
      { name: ServiceCategory.name, schema: ServiceCategorySchema },
    ]),
  ],
  controllers: [AdultServicesController, AdultServicesAdminController],
  providers: [AdultServicesService, AdultServicesSeeder],
  exports: [AdultServicesService, AdultServicesSeeder],
})
export class AdultServicesModule {}
