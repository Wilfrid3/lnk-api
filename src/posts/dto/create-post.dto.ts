import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsArray,
  IsOptional,
  IsEnum,
  MinLength,
  IsNotEmpty,
  ValidateNested,
  ArrayMinSize,
  IsBoolean,
  IsUrl,
  IsPhoneNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ClientType, TravelOption } from '../schemas/post.schema';

class ServiceDto {
  @ApiProperty({ description: 'Nom du service offert' })
  @IsString()
  @IsNotEmpty({ message: 'Le nom du service est requis' })
  service: string;

  @ApiProperty({ description: 'Prix du service' })
  @IsNotEmpty({ message: 'Le prix du service est requis' })
  price: number;
}

export class CreatePostDto {
  @ApiProperty({ description: "Titre de l'annonce", minLength: 5 })
  @IsString()
  @IsNotEmpty({ message: 'Le titre est requis' })
  @MinLength(5, { message: 'Le titre doit contenir au moins 5 caractères' })
  title: string;

  @ApiProperty({
    description: "Description détaillée de l'annonce",
    minLength: 20,
  })
  @IsString()
  @IsNotEmpty({ message: 'La description est requise' })
  @MinLength(20, {
    message: 'La description doit contenir au moins 20 caractères',
  })
  description: string;

  @ApiProperty({
    description: 'Liste des services proposés avec leurs prix',
    type: [ServiceDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceDto)
  @ArrayMinSize(1, { message: 'Au moins un service doit être proposé' })
  services: ServiceDto[];
  @ApiProperty({
    description: 'Photo principale (peut être fournie comme fichier ou URL)',
    required: false,
    oneOf: [
      { type: 'string', format: 'binary' },
      { type: 'string', format: 'uri' },
    ],
  })
  @IsOptional()
  mainPhoto?: string;

  @ApiProperty({
    description:
      'Photos additionnelles (peuvent être fournies comme fichiers ou URLs)',
    type: [String],
    required: false,
    oneOf: [
      { type: 'array', items: { type: 'string', format: 'binary' } },
      { type: 'array', items: { type: 'string', format: 'uri' } },
    ],
  })
  @IsOptional()
  @IsArray()
  additionalPhotos?: string[];

  @ApiProperty({
    description: 'Type de clientèle visée',
    enum: ClientType,
    example: ClientType.TOUS,
  })
  @IsEnum(ClientType, {
    message: 'Le type de clientèle doit être: homme, femme, couple ou tous',
  })
  clientType: ClientType;

  @ApiProperty({ description: 'Description physique', required: false })
  @IsOptional()
  @IsString()
  appearance?: string;

  @ApiProperty({
    description: 'Services spécifiques proposés',
    type: [String],
    example: ['massages', 'sexcam'],
  })
  @IsArray()
  @IsString({ each: true })
  offerings: string[];

  @ApiProperty({ description: "Ville où se situe l'annonce" })
  @IsString()
  @IsNotEmpty({ message: 'La ville est requise' })
  city: string;

  @ApiProperty({ description: 'Quartier ou zone précise', required: false })
  @IsOptional()
  @IsString()
  neighborhood?: string;

  @ApiProperty({
    description: 'Option de déplacement',
    enum: TravelOption,
    example: TravelOption.LES_DEUX,
  })
  @IsEnum(TravelOption, {
    message:
      "L'option de déplacement doit être: reçoit, se déplace, les deux ou aucun",
  })
  travelOption: TravelOption;

  @ApiProperty({ description: 'Numéro de téléphone' })
  @IsPhoneNumber(undefined, {
    message: 'Le format du numéro de téléphone est invalide',
  })
  phoneNumber: string;

  @ApiProperty({ description: 'Numéro WhatsApp', required: false })
  @IsOptional()
  @IsPhoneNumber(undefined, {
    message: 'Le format du numéro WhatsApp est invalide',
  })
  whatsappNumber?: string;

  @ApiProperty({
    description: "Statut actif de l'annonce",
    default: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
