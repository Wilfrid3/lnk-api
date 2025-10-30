import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

// Définition des énumérations
export enum ClientType {
  HOMME = 'homme',
  FEMME = 'femme',
  COUPLE = 'couple',
  TOUS = 'tous',
}

export enum TravelOption {
  RECOIT = 'reçoit',
  SE_DEPLACE = 'se déplace',
  LES_DEUX = 'les deux',
  AUCUN = 'aucun',
}

// Schéma pour les services (sous-document)
@Schema()
export class Service {
  @ApiProperty({ description: 'Nom du service offert' })
  @Prop({ required: true })
  service: string;

  @ApiProperty({ description: 'Prix du service' })
  @Prop({ required: true, min: 0 })
  price: number;
}

export type PostDocument = Post & Document & { _id: Types.ObjectId };

// Schéma principal pour les annonces
@Schema({
  timestamps: true, // Ajouter createdAt et updatedAt
  toJSON: {
    virtuals: true,
    transform: (doc, ret) => {
      ret.id = ret._id; // Convertir _id en id
      delete ret._id;
      delete ret.__v;

      // Rename userId to user when populated
      if (ret.userId && typeof ret.userId !== 'string') {
        ret.user = ret.userId;
        delete ret.userId;
      }
      return ret;
    },
  },
})
export class Post {
  @ApiProperty({ description: "Titre de l'annonce" })
  @Prop({ required: true, trim: true })
  title: string;

  @ApiProperty({ description: "Description de l'annonce" })
  @Prop({ required: true })
  description: string;
  @ApiProperty({ description: 'Type de client', enum: ClientType })
  @Prop({ required: true, enum: ClientType, default: ClientType.TOUS })
  clientType: ClientType;
  @ApiProperty({ description: 'Option de déplacement', enum: TravelOption })
  @Prop({ required: true, enum: TravelOption, default: TravelOption.AUCUN })
  travelOption: TravelOption;

  @ApiProperty({ description: "Ville où se situe l'annonce" })
  @Prop({ required: true })
  city: string;

  @ApiProperty({ description: 'Quartier ou zone précise', required: false })
  @Prop({ required: false })
  neighborhood?: string;

  @ApiProperty({ description: "Prix de l'annonce" })
  @Prop({ required: false, min: 0 })
  price?: number;
  @ApiProperty({
    description: 'Référence à la photo principale',
    required: false,
  })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'PostFile' })
  mainPhoto?: Types.ObjectId;

  @ApiProperty({
    description: 'Références aux photos additionnelles',
    type: [String],
    required: false,
  })
  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'PostFile' }],
    default: [],
  })
  additionalPhotos: Types.ObjectId[];

  @ApiProperty({
    description: 'Références aux vidéos',
    type: [String],
    required: false,
  })
  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'PostFile' }],
    default: [],
  })
  videos: Types.ObjectId[];

  @ApiProperty({
    description: 'Services et prix',
    type: [Service],
    required: false,
  })
  @Prop({ type: [Object], default: [] })
  services?: Service[];

  @ApiProperty({
    description: 'Tags ou catégories',
    type: [String],
    required: false,
  })
  @Prop({ type: [String], default: [] })
  tags?: string[];
  @ApiProperty({ description: 'Description physique', required: false })
  @Prop({ required: false })
  appearance?: string;

  @ApiProperty({ description: 'Services spécifiques proposés', type: [String] })
  @Prop({ type: [String], default: [] })
  offerings: string[];

  @ApiProperty({ description: 'Numéro de téléphone' })
  @Prop({ required: true })
  phoneNumber: string;

  @ApiProperty({ description: 'Numéro WhatsApp', required: false })
  @Prop({ required: false })
  whatsappNumber?: string;
  @ApiProperty({ description: "Statut actif de l'annonce", default: true })
  @Prop({ default: true })
  isActive: boolean;

  @ApiProperty({ description: "Date de suppression de l'annonce", required: false })
  @Prop({ required: false })
  deletedAt?: Date;

  @ApiProperty({
    description: "Indique si l'annonce est mise en avant",
    default: false,
  })
  @Prop({ default: false })
  isFeatured: boolean;

  @ApiProperty({
    description: "Indique si l'annonce est une publicité",
    default: false,
  })
  @Prop({ default: false })
  isAd: boolean;

  @ApiProperty({
    description: "Indique si l'annonce a un statut VIP",
    default: false,
  })
  @Prop({ default: false })
  isVip: boolean;

  @ApiProperty({ description: "Nombre de vues de l'annonce", default: 0 })
  @Prop({ default: 0 })
  views: number;

  @ApiProperty({
    description: 'Utilisateurs qui ont aimé cette annonce',
    type: [String],
  })
  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User' }],
    default: [],
  })
  likes: MongooseSchema.Types.ObjectId[];

  @ApiProperty({ description: 'Nombre total de likes', default: 0 })
  @Prop({ default: 0 })
  likesCount: number;

  @ApiProperty({ description: "ID de l'utilisateur propriétaire" })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: MongooseSchema.Types.ObjectId;
}

export const PostSchema = SchemaFactory.createForClass(Post);

// Create indexes for better performance
PostSchema.index({ userId: 1 });
PostSchema.index({ likes: 1 });
PostSchema.index({ likesCount: -1 });
PostSchema.index({ createdAt: -1 });
PostSchema.index({ isActive: 1 });
