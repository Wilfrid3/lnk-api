// src/seeders/adult-services.seeder.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AdultService } from '../schemas/adult-service.schema';
import { ServiceCategory } from '../schemas/service-category.schema';

@Injectable()
export class AdultServicesSeeder {
  constructor(
    @InjectModel(AdultService.name)
    private adultServiceModel: Model<AdultService>,
    @InjectModel(ServiceCategory.name)
    private serviceCategoryModel: Model<ServiceCategory>,
  ) {}

  async seedCategories() {
    const categories = [
      {
        id: 'base',
        label: 'Services de base',
        icon: 'favorite',
        color: '#f59e0b',
        sortOrder: 1,
      },
      {
        id: 'oral',
        label: 'Services oraux',
        icon: 'circle',
        color: '#ef4444',
        sortOrder: 2,
      },
      {
        id: 'anal',
        label: 'Services anaux',
        icon: 'circle',
        color: '#8b5cf6',
        sortOrder: 3,
      },
      {
        id: 'massage',
        label: 'Massages',
        icon: 'spa',
        color: '#06b6d4',
        sortOrder: 4,
      },
      {
        id: 'positions',
        label: 'Positions',
        icon: 'fitness_center',
        color: '#10b981',
        sortOrder: 5,
      },
      {
        id: 'multiple',
        label: 'Services multiples',
        icon: 'group',
        color: '#f97316',
        sortOrder: 6,
      },
      {
        id: 'accessoires',
        label: 'Accessoires & Jeux',
        icon: 'fitness_center',
        color: '#ec4899',
        sortOrder: 7,
      },
      {
        id: 'bdsm',
        label: 'BDSM & Domination',
        icon: 'sports_martial_arts',
        color: '#7c3aed',
        sortOrder: 8,
      },
      {
        id: 'specialites',
        label: 'Spécialités',
        icon: 'whatshot',
        color: '#dc2626',
        sortOrder: 9,
      },
      {
        id: 'virtuel',
        label: 'Services virtuels',
        icon: 'videocam',
        color: '#2563eb',
        sortOrder: 10,
      },
      {
        id: 'fetichisme',
        label: 'Fétichisme',
        icon: 'visibility',
        color: '#9333ea',
        sortOrder: 11,
      },
      {
        id: 'exterieur',
        label: 'Extérieur',
        icon: 'park',
        color: '#059669',
        sortOrder: 12,
      },
      {
        id: 'accompagnement',
        label: 'Accompagnement',
        icon: 'event',
        color: '#0891b2',
        sortOrder: 13,
      },
      {
        id: 'luxe',
        label: 'Services de luxe',
        icon: 'star',
        color: '#ca8a04',
        sortOrder: 14,
      },
    ];

    for (const category of categories) {
      await this.serviceCategoryModel.findOneAndUpdate(
        { id: category.id },
        category,
        { upsert: true, new: true },
      );
    }

    console.log('✅ Service categories seeded successfully');
  }

  async seedServices() {
    const services = [
      // Services intimes de base
      {
        id: 'service_traditionnel',
        label: 'Service traditionnel',
        category: 'base',
        icon: 'favorite',
        sortOrder: 1,
      },
      {
        id: 'service_classique',
        label: 'Service classique',
        category: 'base',
        icon: 'favorite',
        sortOrder: 2,
      },
      {
        id: 'caresses',
        label: 'Caresses',
        category: 'base',
        icon: 'touch_app',
        sortOrder: 3,
      },
      {
        id: 'baisers',
        label: 'Baisers',
        category: 'base',
        icon: 'favorite_border',
        sortOrder: 4,
      },
      {
        id: 'preliminaires',
        label: 'Préliminaires',
        category: 'base',
        icon: 'favorite_border',
        sortOrder: 5,
      },

      // Services oraux
      {
        id: 'fellation',
        label: 'Fellation',
        category: 'oral',
        icon: 'circle',
        sortOrder: 10,
      },
      {
        id: 'fellation_avec_deglutition',
        label: 'Fellation avec déglutition',
        category: 'oral',
        icon: 'circle',
        sortOrder: 11,
      },
      {
        id: 'fellation_sans_preservatif',
        label: 'Fellation sans préservatif',
        category: 'oral',
        icon: 'circle',
        sortOrder: 12,
      },
      {
        id: 'cunnilingus',
        label: 'Cunnilingus',
        category: 'oral',
        icon: 'favorite',
        sortOrder: 13,
      },
      {
        id: 'annulingus',
        label: 'Annulingus',
        category: 'oral',
        icon: 'favorite',
        sortOrder: 14,
      },
      {
        id: '69',
        label: '69',
        category: 'oral',
        icon: 'favorite',
        sortOrder: 15,
      },

      // Services anaux
      {
        id: 'sodomie',
        label: 'Sodomie',
        category: 'anal',
        icon: 'circle',
        sortOrder: 20,
      },
      {
        id: 'penetration_anale',
        label: 'Pénétration anale',
        category: 'anal',
        icon: 'circle',
        sortOrder: 21,
      },
      {
        id: 'jeux_anaux',
        label: 'Jeux anaux',
        category: 'anal',
        icon: 'circle',
        sortOrder: 22,
      },

      // Massages
      {
        id: 'massage_erotique',
        label: 'Massage érotique',
        category: 'massage',
        icon: 'spa',
        sortOrder: 23,
      },
      {
        id: 'massage_tantrique',
        label: 'Massage tantrique',
        category: 'massage',
        icon: 'spa',
        sortOrder: 24,
      },
      {
        id: 'massage_naturiste',
        label: 'Massage naturiste',
        category: 'massage',
        icon: 'spa',
        sortOrder: 25,
      },
      {
        id: 'massage_lingam',
        label: 'Massage lingam',
        category: 'massage',
        icon: 'spa',
        sortOrder: 26,
      },
      {
        id: 'massage_yoni',
        label: 'Massage yoni',
        category: 'massage',
        icon: 'spa',
        sortOrder: 27,
      },
      {
        id: 'massage_prostatique',
        label: 'Massage prostatique',
        category: 'massage',
        icon: 'spa',
        sortOrder: 28,
      },
      {
        id: 'massage_corps_a_corps',
        label: 'Massage corps à corps',
        category: 'massage',
        icon: 'spa',
        sortOrder: 29,
      },

      // Positions et pratiques
      {
        id: 'toutes_positions',
        label: 'Toutes positions',
        category: 'positions',
        icon: 'fitness_center',
        sortOrder: 30,
      },
      {
        id: 'amazone',
        label: 'Amazone',
        category: 'positions',
        icon: 'fitness_center',
        sortOrder: 31,
      },
      {
        id: 'levrette',
        label: 'Levrette',
        category: 'positions',
        icon: 'fitness_center',
        sortOrder: 32,
      },
      {
        id: 'missionnaire',
        label: 'Missionnaire',
        category: 'positions',
        icon: 'fitness_center',
        sortOrder: 33,
      },
      {
        id: 'cuillere',
        label: 'Cuillère',
        category: 'positions',
        icon: 'fitness_center',
        sortOrder: 34,
      },
      {
        id: 'andromaque',
        label: 'Andromaque',
        category: 'positions',
        icon: 'fitness_center',
        sortOrder: 35,
      },

      // Services multiples
      {
        id: 'plan_a_trois',
        label: 'Plan à trois',
        category: 'multiple',
        icon: 'group',
        sortOrder: 36,
      },
      {
        id: 'partouze',
        label: 'Partouze',
        category: 'multiple',
        icon: 'group',
        sortOrder: 37,
      },
      {
        id: 'gang_bang',
        label: 'Gang bang',
        category: 'multiple',
        icon: 'group',
        sortOrder: 38,
      },
      {
        id: 'orgie',
        label: 'Orgie',
        category: 'multiple',
        icon: 'group',
        sortOrder: 39,
      },
      {
        id: 'echangisme',
        label: 'Échangisme',
        category: 'multiple',
        icon: 'group',
        sortOrder: 40,
      },
      {
        id: 'melangisme',
        label: 'Mélangisme',
        category: 'multiple',
        icon: 'group',
        sortOrder: 41,
      },

      // Jeux et accessoires
      {
        id: 'gode',
        label: 'Utilisation de gode',
        category: 'accessoires',
        icon: 'fitness_center',
        sortOrder: 42,
      },
      {
        id: 'sextoys',
        label: 'Sex-toys',
        category: 'accessoires',
        icon: 'fitness_center',
        sortOrder: 43,
      },
      {
        id: 'vibromasseurs',
        label: 'Vibromasseurs',
        category: 'accessoires',
        icon: 'fitness_center',
        sortOrder: 44,
      },
      {
        id: 'plug_anal',
        label: 'Plug anal',
        category: 'accessoires',
        icon: 'fitness_center',
        sortOrder: 45,
      },
      {
        id: 'menottes',
        label: 'Menottes',
        category: 'accessoires',
        icon: 'lock',
        sortOrder: 46,
      },
      {
        id: 'fouet',
        label: 'Fouet',
        category: 'accessoires',
        icon: 'sports_martial_arts',
        sortOrder: 47,
      },

      // BDSM et domination
      {
        id: 'domination',
        label: 'Domination',
        category: 'bdsm',
        icon: 'sports_martial_arts',
        sortOrder: 48,
      },
      {
        id: 'soumission',
        label: 'Soumission',
        category: 'bdsm',
        icon: 'sports_martial_arts',
        sortOrder: 49,
      },
      {
        id: 'bondage',
        label: 'Bondage',
        category: 'bdsm',
        icon: 'lock',
        sortOrder: 50,
      },
      {
        id: 'spanking',
        label: 'Spanking',
        category: 'bdsm',
        icon: 'sports_martial_arts',
        sortOrder: 51,
      },
      {
        id: 'cire_chaude',
        label: 'Cire chaude',
        category: 'bdsm',
        icon: 'local_fire_department',
        sortOrder: 52,
      },
      {
        id: 'jeux_de_role',
        label: 'Jeux de rôle',
        category: 'bdsm',
        icon: 'theater_comedy',
        sortOrder: 53,
      },

      // Spécialités
      {
        id: 'strip_tease',
        label: 'Strip-tease',
        category: 'specialites',
        icon: 'whatshot',
        sortOrder: 54,
      },
      {
        id: 'lap_dance',
        label: 'Lap dance',
        category: 'specialites',
        icon: 'music_note',
        sortOrder: 55,
      },
      {
        id: 'show_prive',
        label: 'Show privé',
        category: 'specialites',
        icon: 'visibility',
        sortOrder: 56,
      },
      {
        id: 'danse_sensuelle',
        label: 'Danse sensuelle',
        category: 'specialites',
        icon: 'music_note',
        sortOrder: 57,
      },
      {
        id: 'jeux_de_seduction',
        label: 'Jeux de séduction',
        category: 'specialites',
        icon: 'favorite',
        sortOrder: 58,
      },

      // Services virtuels
      {
        id: 'sexcam',
        label: 'Sexcam',
        category: 'virtuel',
        icon: 'videocam',
        sortOrder: 59,
      },
      {
        id: 'video_call',
        label: 'Appel vidéo',
        category: 'virtuel',
        icon: 'video_call',
        sortOrder: 60,
      },
      {
        id: 'chat_erotique',
        label: 'Chat érotique',
        category: 'virtuel',
        icon: 'chat',
        sortOrder: 61,
      },
      {
        id: 'photos_personnalisees',
        label: 'Photos personnalisées',
        category: 'virtuel',
        icon: 'photo_camera',
        sortOrder: 62,
      },
      {
        id: 'videos_personnalisees',
        label: 'Vidéos personnalisées',
        category: 'virtuel',
        icon: 'videocam',
        sortOrder: 63,
      },

      // Services particuliers / Fétichisme
      {
        id: 'fetichisme_pieds',
        label: 'Fétichisme des pieds',
        category: 'fetichisme',
        icon: 'directions_walk',
        sortOrder: 64,
      },
      {
        id: 'fetichisme_lingerie',
        label: 'Fétichisme lingerie',
        category: 'fetichisme',
        icon: 'checkroom',
        sortOrder: 65,
      },
      {
        id: 'urophilie',
        label: 'Urophilie',
        category: 'fetichisme',
        icon: 'water_drop',
        sortOrder: 66,
      },
      {
        id: 'exhibitionnisme',
        label: 'Exhibitionnisme',
        category: 'fetichisme',
        icon: 'visibility',
        sortOrder: 67,
      },
      {
        id: 'voyeurisme',
        label: 'Voyeurisme',
        category: 'fetichisme',
        icon: 'remove_red_eye',
        sortOrder: 68,
      },

      // Services extérieurs
      {
        id: 'sexe_dehors',
        label: 'Sexe en extérieur',
        category: 'exterieur',
        icon: 'park',
        sortOrder: 69,
      },
      {
        id: 'voiture',
        label: 'Dans la voiture',
        category: 'exterieur',
        icon: 'directions_car',
        sortOrder: 70,
      },
      {
        id: 'plage',
        label: 'À la plage',
        category: 'exterieur',
        icon: 'beach_access',
        sortOrder: 71,
      },
      {
        id: 'foret',
        label: 'En forêt',
        category: 'exterieur',
        icon: 'park',
        sortOrder: 72,
      },

      // Accompagnement
      {
        id: 'gfe',
        label: 'Girlfriend Experience',
        category: 'accompagnement',
        icon: 'favorite',
        sortOrder: 73,
      },
      {
        id: 'diner_aux_chandelles',
        label: 'Dîner aux chandelles',
        category: 'accompagnement',
        icon: 'restaurant',
        sortOrder: 74,
      },
      {
        id: 'soiree_accompagnement',
        label: "Soirée d'accompagnement",
        category: 'accompagnement',
        icon: 'event',
        sortOrder: 75,
      },
      {
        id: 'week_end_complet',
        label: 'Week-end complet',
        category: 'accompagnement',
        icon: 'weekend',
        sortOrder: 76,
      },
      {
        id: 'voyage_accompagnement',
        label: "Voyage d'accompagnement",
        category: 'accompagnement',
        icon: 'flight',
        sortOrder: 77,
      },

      // Services de luxe
      {
        id: 'service_vip',
        label: 'Service VIP',
        category: 'luxe',
        icon: 'star',
        sortOrder: 78,
      },
      {
        id: 'champagne_service',
        label: 'Service champagne',
        category: 'luxe',
        icon: 'wine_bar',
        sortOrder: 79,
      },
      {
        id: 'jacuzzi',
        label: 'Jacuzzi',
        category: 'luxe',
        icon: 'hot_tub',
        sortOrder: 80,
      },
      {
        id: 'suite_luxe',
        label: 'Suite de luxe',
        category: 'luxe',
        icon: 'hotel',
        sortOrder: 81,
      },
    ];

    for (const service of services) {
      await this.adultServiceModel.findOneAndUpdate(
        { id: service.id },
        service,
        { upsert: true, new: true },
      );
    }

    console.log('✅ Adult services seeded successfully');
  }

  async seed() {
    console.log('🌱 Starting adult services seeding...');
    await this.seedCategories();
    await this.seedServices();
    console.log('✅ Adult services seeding completed');
  }
}
