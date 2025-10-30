import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../users/users.service';

async function makeUserAdmin() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);

  // Get user identifier from command line arguments
  const userIdentifier = process.argv[2];

  if (!userIdentifier) {
    console.error('Please provide a user email or phone number');
    console.log('Usage: npm run cli:make-admin <email_or_phone>');
    process.exit(1);
  }

  try {
    // Find user by email or phone
    let user = await usersService.findByEmail(userIdentifier);
    if (!user) {
      user = await usersService.findByPhone(userIdentifier);
    }

    if (!user) {
      console.error(`User not found with identifier: ${userIdentifier}`);
      process.exit(1);
    }

    // Update user to be admin
    if (!user._id) {
      console.error('User ID is missing');
      process.exit(1);
    }

    const updatedUser = await usersService.update(user._id.toString(), {
      isAdmin: true,
    });

    console.log(`✅ Successfully made user admin:`);
    console.log(`- ID: ${updatedUser._id}`);
    console.log(`- Name: ${updatedUser.name || 'N/A'}`);
    console.log(`- Email: ${updatedUser.email || 'N/A'}`);
    console.log(`- Phone: ${updatedUser.phoneNumber || 'N/A'}`);
    console.log(`- isAdmin: ${updatedUser.isAdmin}`);
  } catch (error) {
    console.error('Error making user admin:', error.message);
    process.exit(1);
  } finally {
    await app.close();
  }
}

makeUserAdmin();
