import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FirebaseService {
  constructor(private configService: ConfigService) {
    // Initialize Firebase Admin SDK if not already initialized
    if (!admin.apps.length) {
      const serviceAccount = {
        projectId: configService.get<string>('FIREBASE_PROJECT_ID'),
        clientEmail: configService.get<string>('FIREBASE_CLIENT_EMAIL'),
        privateKey: configService.get<string>('FIREBASE_PRIVATE_KEY')
          ? configService
              .get<string>('FIREBASE_PRIVATE_KEY')
              ?.replace(/\\n/g, '\n')
          : undefined,
      };

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }
  }

  async verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
    try {
      return await admin.auth().verifyIdToken(idToken);
    } catch (error) {
      throw new Error(`Error verifying Firebase token: ${error.message}`);
    }
  }

  async getUserByPhoneNumber(
    phoneNumber: string,
  ): Promise<admin.auth.UserRecord | null> {
    try {
      return await admin.auth().getUserByPhoneNumber(phoneNumber);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        return null;
      }
      throw new Error(`Error getting user by phone: ${error.message}`);
    }
  }

  async getUserByEmail(email: string): Promise<admin.auth.UserRecord | null> {
    try {
      return await admin.auth().getUserByEmail(email);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        return null;
      }
      throw new Error(`Error getting user by email: ${error.message}`);
    }
  }

  async getUserById(uid: string): Promise<admin.auth.UserRecord | null> {
    try {
      return await admin.auth().getUser(uid);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        return null;
      }
      throw new Error(`Error getting user by ID: ${error.message}`);
    }
  }

  /**
   * Verify Google ID token and return decoded token
   * @param idToken Google ID token
   * @returns Decoded token information
   */ async verifyGoogleIdToken(idToken: string): Promise<any> {
    try {
      // Log the token (first few characters for debugging)
      // console.log(`Attempting to verify token: ${idToken.substring(0, 10)}...`);

      // Verify the ID token using Firebase Admin
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      // console.log(
      //   'Token verification successful, decoded claims:',
      //   JSON.stringify({
      //     uid: decodedToken.uid,
      //     email: decodedToken.email,
      //     email_verified: decodedToken.email_verified,
      //     name: decodedToken.name,
      //     picture: decodedToken.picture,
      //   }),
      // );
      return decodedToken;
    } catch (error) {
      console.error('Google ID token verification failed:', error);
      // More descriptive error
      if (error.code) {
        throw new Error(`Firebase error (${error.code}): ${error.message}`);
      }
      throw new Error('Invalid Google ID token');
    }
  }
}
