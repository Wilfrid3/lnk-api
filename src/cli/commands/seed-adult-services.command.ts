// src/cli/commands/seed-adult-services.command.ts
import { Command } from 'nest-commander';
import { BaseCommand } from '../base.command';
import { AdultServicesSeeder } from '../../modules/adult-services/seeders/adult-services.seeder';

@Command({
  name: 'seed:adult-services',
  description: 'Seed adult services and categories',
})
export class SeedAdultServicesCommand extends BaseCommand {
  constructor(private readonly adultServicesSeeder: AdultServicesSeeder) {
    super();
  }

  async run(): Promise<void> {
    console.log('Starting adult services seeding...');
    await this.adultServicesSeeder.seed();
    console.log('Adult services seeding completed!');
  }
}
