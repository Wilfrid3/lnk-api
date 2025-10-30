// src/cli/bootstrap.ts
import { CommandFactory } from 'nest-commander';
import { CliModule } from './cli.module';

async function bootstrap() {
  console.log('Starting CLI application...');
  try {
    await CommandFactory.run(CliModule, ['error', 'warn', 'log', 'debug', 'verbose']);
    console.log('CLI command completed successfully');
  } catch (error) {
    console.error('Command failed:', error);
    process.exit(1);
  } finally {
    console.log('Exiting...');
    process.exit(0);
  }
}

bootstrap().catch((err) => {
  console.error('Bootstrap failed:', err);
  process.exit(1);
});
