import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export class InsufficientCreditsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InsufficientCreditsError';
  }
}

export interface UserCredits {
  freeCredits: number;
  paidTier1Credits: number;
  paidTier2Credits: number;
  createdAt: Date;
}

export async function checkUserCredits(userId: string): Promise<boolean> {
  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      // Initialize user document with default credits
      await setDoc(userRef, {
        freeCredits: 50, // Give 3 free credits to start
        paidTier1Credits: 0,
        paidTier2Credits: 0,
        createdAt: new Date()
      });
      return true; // User has free credits after initialization
    }

    const userData = userSnap.data();
    const freeCredits = userData?.freeCredits ?? 0;
    const paidTier1Credits = userData?.paidTier1Credits ?? 0;
    const paidTier2Credits = userData?.paidTier2Credits ?? 0;

    return freeCredits > 0 || paidTier1Credits > 0 || paidTier2Credits > 0;
  } catch (error) {
    console.error('Error checking user credits:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to check credits. Please try again later.');
  }
}

export async function getUserCredits(userId: string): Promise<UserCredits> {
  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      // Initialize user document with default credits
      const defaultCredits: UserCredits = {
        freeCredits: 50,
        paidTier1Credits: 0,
        paidTier2Credits: 0,
        createdAt: new Date()
      };
      await setDoc(userRef, defaultCredits);
      return defaultCredits;
    }

    const userData = userSnap.data();
    return {
      freeCredits: userData.freeCredits ?? 0,
      paidTier1Credits: userData.paidTier1Credits ?? 0,
      paidTier2Credits: userData.paidTier2Credits ?? 0,
      createdAt: userData.createdAt.toDate()
    };
  } catch (error) {
    console.error('Error getting user credits:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to get credits. Please try again later.');
  }
}