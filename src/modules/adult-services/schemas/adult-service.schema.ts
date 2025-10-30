// src/schemas/adult-service.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({
  collection: 'adult_services',
  timestamps: true,
})
export class AdultService extends Document {
  @Prop({ type: String, required: true, unique: true })
  id: string; // Custom ID like "service_traditionnel"

  @Prop({ type: String, required: true })
  label: string;

  @Prop({ type: String, required: true })
  category: string;

  @Prop({ type: String, required: true })
  icon: string;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: Number, default: 0 })
  sortOrder: number; // For admin ordering
}

export const AdultServiceSchema = SchemaFactory.createForClass(AdultService);

// Create indexes
AdultServiceSchema.index({ category: 1 });
AdultServiceSchema.index({ isActive: 1 });
AdultServiceSchema.index({ sortOrder: 1 });
