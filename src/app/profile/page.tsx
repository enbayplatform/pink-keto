'use client';

import { useAuth } from '@/context/AuthContext';
import { getUserCredits, type UserCredits } from '@/lib/credit';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [creditsLoading, setCreditsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    async function loadCredits() {
      if (user) {
        try {
          const userCredits = await getUserCredits(user.uid);
          setCredits(userCredits);
        } catch (error) {
          console.error('Error loading credits:', error);
        } finally {
          setCreditsLoading(false);
        }
      }
    }

    loadCredits();
  }, [user]);

  if (loading || creditsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Profile</h1>
      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <div className="flex items-center space-x-4">
          {user.photoURL && (
            <img
              src={user.photoURL}
              alt="Profile"
              className="w-20 h-20 rounded-full"
            />
          )}
          <div>
            <h2 className="text-2xl font-semibold">{user.displayName}</h2>
            <p className="text-gray-600">{user.email}</p>
          </div>
        </div>
        
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4">Account Information</h3>
          <div className="space-y-3">
            <div>
              <span className="text-gray-600">Email verified:</span>
              <span className="ml-2">{user.emailVerified ? 'Yes' : 'No'}</span>
            </div>
            <div>
              <span className="text-gray-600">Account created:</span>
              <span className="ml-2">
                {user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Last sign in:</span>
              <span className="ml-2">
                {user.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {credits && (
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Credits</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-pink-50 p-4 rounded-lg">
                <div className="text-pink-600 font-semibold">Free Credits</div>
                <div className="text-2xl font-bold">{credits.freeCredits}</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-purple-600 font-semibold">Tier 1 Credits</div>
                <div className="text-2xl font-bold">{credits.paidTier1Credits}</div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-blue-600 font-semibold">Tier 2 Credits</div>
                <div className="text-2xl font-bold">{credits.paidTier2Credits}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
