import { Injectable, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { ConfigService } from '@nestjs/config';

/**
 * Enhanced Firebase service with better error handling and debugging
 * Copy this implementation to your firebase.service.ts file
 */
@Injectable()
export class FirebaseService implements OnModuleInit {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Initialize Firebase on module init for better error handling during startup
   */
  onModuleInit() {
    this.initializeFirebase();
  }

  /**
   * Initialize Firebase Admin SDK with proper error handling
   */
  private initializeFirebase() {
    console.log('Initializing Firebase service...');

    // Initialize Firebase Admin SDK if not already initialized
    if (!admin.apps.length) {
      try {
        // Get Firebase credentials
        const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
        const clientEmail = this.configService.get<string>(
          'FIREBASE_CLIENT_EMAIL',
        );
        let privateKey = this.configService.get<string>('FIREBASE_PRIVATE_KEY');

        // Log availability (without exposing values)
        console.log('Firebase credentials available:', {
          projectId: !!projectId,
          clientEmail: !!clientEmail,
          privateKey: !!privateKey,
        });

        // Check for required credentials
        if (!projectId || !clientEmail || !privateKey) {
          throw new Error(
            `Missing Firebase credentials: ${!projectId ? 'FIREBASE_PROJECT_ID ' : ''}${
              !clientEmail ? 'FIREBASE_CLIENT_EMAIL ' : ''
            }${!privateKey ? 'FIREBASE_PRIVATE_KEY' : ''}`,
          );
        }

        // Format the private key correctly
        if (privateKey) {
          privateKey = privateKey.replace(/\\n/g, '\n');
        }

        const serviceAccount = {
          projectId,
          clientEmail,
          privateKey,
        };

        // Initialize the app
        admin.initializeApp({
          credential: admin.credential.cert(
            serviceAccount as admin.ServiceAccount,
          ),
        });

        console.log('Firebase Admin SDK initialized successfully');
      } catch (error) {
        console.error('Failed to initialize Firebase Admin:', error);
        throw error; // Re-throw to prevent app from starting with invalid Firebase config
      }
    } else {
      console.log('Firebase Admin SDK was already initialized');
    }
  }

  /**
   * Test method to verify Firebase connection
   */
  async testFirebaseConnection(): Promise<boolean> {
    try {
      // Just verify we can access the auth API
      await admin.auth().listUsers(1);
      return true;
    } catch (error) {
      console.error('Firebase connection test failed:', error);
      return false;
    }
  }

  /**
   * Verify Google ID token with improved error handling and debugging
   */
  async verifyGoogleIdToken(idToken: string): Promise<any> {
    if (!idToken) {
      console.error('No ID token provided');
      throw new Error('ID token is required');
    }

    console.log(`Verifying token: ${idToken.substring(0, 10)}...`);

    try {
      // Verify the ID token using Firebase Admin
      const decodedToken = await admin.auth().verifyIdToken(idToken);

      console.log('Token verification successful, claims:', {
        uid: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name || 'N/A',
        picture: decodedToken.picture ? 'Available' : 'Not available',
        provider_id: decodedToken.firebase?.sign_in_provider,
      });

      return decodedToken;
    } catch (error) {
      console.error('Google ID token verification failed:', {
        code: error.code,
        message: error.message,
        errorInfo: error.errorInfo,
      });

      if (error.code === 'auth/argument-error') {
        throw new Error('Invalid token format: The token might be malformed');
      } else if (error.code === 'auth/id-token-expired') {
        throw new Error(
          'Token expired: Please obtain a new token and try again',
        );
      } else if (error.code === 'auth/id-token-revoked') {
        throw new Error('Token revoked: The token has been revoked');
      } else {
        throw new Error(
          `Firebase error (${error.code || 'unknown'}): ${error.message}`,
        );
      }
    }
  }
}
