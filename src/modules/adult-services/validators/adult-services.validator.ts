// src/validators/adult-services.validator.ts
import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { Injectable } from '@nestjs/common';
import { AdultServicesService } from '../services/adult-services.service';

export function IsValidAdultServices(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidAdultServices',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        async validate(value: any, args: ValidationArguments) {
          if (!Array.isArray(value)) return false;
          if (value.length === 0) return false;
          if (value.length > 6) return false;

          // Get service from DI container
          const adultServicesService = args.object[
            'adultServicesService'
          ] as AdultServicesService;
          if (!adultServicesService) return false;

          return await adultServicesService.validateServiceIds(value);
        },
        defaultMessage(args: ValidationArguments) {
          return 'Services must be an array of valid service IDs (1-6 items)';
        },
      },
    });
  };
}
