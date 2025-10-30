// src/cli/base.command.ts
import { CommandRunner } from 'nest-commander';

export abstract class BaseCommand extends CommandRunner {
  protected async logStart(commandName: string): Promise<void> {
    console.log(`\n🚀 Starting ${commandName}...`);
  }

  protected async logSuccess(commandName: string): Promise<void> {
    console.log(`✅ ${commandName} completed successfully!\n`);
  }

  protected async logError(commandName: string, error: any): Promise<void> {
    console.error(`❌ ${commandName} failed:`, error);
    throw error;
  }
}
