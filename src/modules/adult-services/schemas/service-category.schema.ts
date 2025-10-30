// src/schemas/service-category.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({
  collection: 'service_categories',
  timestamps: true,
})
export class ServiceCategory extends Document {
  @Prop({ type: String, required: true, unique: true })
  id: string; // Custom ID like "base", "oral", etc.

  @Prop({ type: String, required: true })
  label: string;

  @Prop({ type: String, required: true })
  icon: string;

  @Prop({ type: String, required: true })
  color: string;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: Number, default: 0 })
  sortOrder: number;
}

export const ServiceCategorySchema =
  SchemaFactory.createForClass(ServiceCategory);

// Create indexes
ServiceCategorySchema.index({ isActive: 1 });
ServiceCategorySchema.index({ sortOrder: 1 });
