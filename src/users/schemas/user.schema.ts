import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_, ret) => {
      delete ret.__v;
      return ret;
    },
  },
})
export class User {
  // Explicitly define _id field
  _id?: Types.ObjectId;

  @Prop({ required: false, unique: true, sparse: true })
  phoneNumber?: string;

  @Prop({ required: false, default: 'CM' })
  countryCode?: string;

  @Prop({ default: false })
  isPhoneVerified: boolean;

  @Prop({ unique: true, sparse: true })
  email?: string;
  @Prop()
  name?: string;

  @Prop()
  password?: string;

  @Prop()
  age?: number;

  @Prop()
  bio?: string;

  @Prop({ default: 'user' })
  userType: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isEmailVerified: boolean;

  @Prop()
  refreshToken?: string;

  @Prop()
  firebaseUid?: string;

  @Prop()
  avatar?: string;

  @Prop()
  coverImage?: string;

  @Prop()
  googleId?: string;

  @Prop({ default: 'phone' }) // 'phone' or 'social'
  authType: string;

  @Prop({ default: false })
  acceptedTermsAndPrivacy: boolean;

  @Prop({ default: false })
  isPremium: boolean;

  @Prop({ default: false })
  isVerified: boolean;

  @Prop({ default: false })
  isAdmin: boolean;

  // Preferences and rates fields
  @Prop()
  clientType?: string;

  @Prop()
  appearance?: string;

  @Prop({ type: [String], default: [] })
  offerings?: string[];

  @Prop({ min: 0 })
  hourlyRate?: number;

  @Prop({ min: 0 })
  halfDayRate?: number;

  @Prop({ min: 0 })
  fullDayRate?: number;

  @Prop({ min: 0 })
  weekendRate?: number;

  @Prop()
  availabilityHours?: string;

  @Prop()
  specialServices?: string;

  @Prop({ type: [String], default: [] })
  paymentMethods?: string[];

  @Prop()
  additionalNotes?: string;

  // Engagement fields
  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  followers?: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  following?: Types.ObjectId[];

  @Prop({ default: 0, min: 0 })
  profileViews?: number;

  @Prop({ default: 0, min: 0, max: 5 })
  averageRating?: number;

  @Prop({ default: 0, min: 0 })
  totalRatings?: number;

  @Prop({ default: 0, min: 0 })
  ratingCount?: number;

  @Prop({ default: 0, min: 0 })
  currentRank?: number;

  @Prop({
    type: {
      week: { type: Number, default: 0 },
      month: { type: Number, default: 0 },
      year: { type: Number, default: 0 },
    },
    default: { week: 0, month: 0, year: 0 },
  })
  rankHistory?: {
    week: number;
    month: number;
    year: number;
  };

  // Invite system fields
  @Prop({ unique: true, sparse: true })
  inviteCode?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  invitedBy?: Types.ObjectId;

  @Prop({
    type: {
      totalInvitedUsers: { type: Number, default: 0 },
      totalRewards: { type: Number, default: 0 },
      currency: { type: String, default: 'YZ' },
    },
    default: { totalInvitedUsers: 0, totalRewards: 0, currency: 'YZ' },
  })
  inviteRewards?: {
    totalInvitedUsers: number;
    totalRewards: number;
    currency: string;
  };

  // Service packages as embedded documents
  @Prop({
    type: [
      {
        _id: { type: String, required: true },
        title: { type: String, required: true },
        services: {
          type: [String],
          required: true,
          validate: [arrayLimit, '{PATH} exceeds the limit of 6'],
        },
        price: { type: Number, required: true },
        currency: { type: String, default: 'FCFA' },
        duration: { type: String },
        description: { type: String },
        isActive: { type: Boolean, default: true },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
    default: [],
  })
  servicePackages?: ServicePackage[];
}

// Validation function for max 6 services
function arrayLimit(val: string[]) {
  return val.length <= 6;
}

// Add custom validation to the schema
export const UserSchema = SchemaFactory.createForClass(User);

// Interface for ServicePackage
export interface ServicePackage {
  _id: string;
  title: string;
  services: string[];
  price: number;
  currency: string;
  duration?: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Add a validation rule to make phoneNumber required only for 'phone' auth type
UserSchema.pre('validate', function (next) {
  // If authType is 'phone' but phoneNumber is missing, add a validation error
  if (this.authType === 'phone' && !this.phoneNumber) {
    this.invalidate(
      'phoneNumber',
      'Phone number is required for phone authentication',
      this.phoneNumber,
    );
  }
  next();
});

// Create indexes for engagement features
UserSchema.index({ followers: 1 });
UserSchema.index({ following: 1 });
UserSchema.index({ currentRank: 1 });
UserSchema.index({ averageRating: -1 });
UserSchema.index({ profileViews: -1 });

// Create index for invitedBy field
UserSchema.index({ invitedBy: 1 });
