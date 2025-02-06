import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export class InsufficientCreditsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InsufficientCreditsError';
  }
}

export interface UserCredits {
  free: number;
  onetime: number;
  monthly: number;
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
        free: 50, // Give 3 free credits to start
        onetime: 0,
        monthly: 0,
        createdAt: new Date()
      });
      return true; // User has free credits after initialization
    }

    const userData = userSnap.data();
    const free = userData?.free ?? 0;
    const onetime = userData?.onetime ?? 0;
    const monthly = userData?.monthly ?? 0;

    return free > 0 || onetime > 0 || monthly;
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
        free: 50,
        onetime: 0,
        monthly: 0,
        createdAt: new Date()
      };
      await setDoc(userRef, defaultCredits);
      return defaultCredits;
    }

    const userData = userSnap.data();
    return {
      free: userData.free ?? 0,
      onetime: userData.onetime ?? 0,
      monthly: userData.monthly ?? 0,
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