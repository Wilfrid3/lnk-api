# CLI Infrastructure

This directory contains the reusable CLI infrastructure for running commands across different modules.

## Structure

- `bootstrap.ts` - Main entry point for CLI commands
- `cli.module.ts` - NestJS module that sets up the CLI environment
- `base.command.ts` - Base class for all commands with common logging functionality

## Usage

### Creating a New Command

1. Create your command class extending `BaseCommand`:

```typescript
// src/modules/your-module/commands/your-command.ts
import { Command } from 'nest-commander';
import { BaseCommand } from '../../../cli/base.command';
import { YourSeeder } from '../seeders/your-seeder';

@Command({
  name: 'seed:your-module',
  description: 'Description of your command',
})
export class YourCommand extends BaseCommand {
  constructor(private readonly yourSeeder: YourSeeder) {
    super();
  }

  async run(): Promise<void> {
    try {
      await this.logStart('Your Command');
      await this.yourSeeder.seed();
      await this.logSuccess('Your Command');
    } catch (error) {
      await this.logError('Your Command', error);
    }
  }
}
```

2. Register your command in `cli.module.ts`:

```typescript
// Add your module to imports
imports: [
  // ...existing imports...
  YourModule,
],
providers: [
  // ...existing commands...
  YourCommand,
],
```

3. Add npm script in `package.json`:

```json
{
  "scripts": {
    "seed:your-module": "ts-node -r tsconfig-paths/register src/cli/bootstrap.ts seed:your-module"
  }
}
```

### Running Commands

```bash
npm run seed:adult-services
npm run seed:your-module
```

## Base Command Features

The `BaseCommand` class provides:

- `logStart(commandName)` - Logs command start with emoji
- `logSuccess(commandName)` - Logs successful completion with emoji
- `logError(commandName, error)` - Logs errors with emoji and re-throws

## Environment

The CLI module automatically sets up:

- Configuration management
- MongoDB connection
- All necessary module dependencies
