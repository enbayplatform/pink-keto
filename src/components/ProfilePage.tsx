'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import Image from 'next/image';
import ImageUpload from './ImageUpload';

interface UserProfile {
  name: string;
  email: string;
  photoURL: string;
  bio: string;
}

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    email: '',
    photoURL: '',
    bio: '',
  });
  const [editedProfile, setEditedProfile] = useState<UserProfile>(profile);

  useEffect(() => {
    const loadProfile = async () => {
      if (user) {
        try {
          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const userData = userSnap.data() as UserProfile;
            setProfile(userData);
            setEditedProfile(userData);
          } else {
            // Create initial profile
            const initialProfile = {
              name: user.displayName || '',
              email: user.email || '',
              photoURL: user.photoURL || '/default-avatar.png',
              bio: '',
            };
            await setDoc(userRef, initialProfile);
            setProfile(initialProfile);
            setEditedProfile(initialProfile);
          }
          setError(null);
        } catch (err) {
          console.error('Error loading profile:', err);
          setError('Failed to load profile. Please try again later.');
        }
      }
    };

    loadProfile();
  }, [user]);

  const handleSave = async () => {
    if (user) {
      try {
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, editedProfile, { merge: true });
        setProfile(editedProfile);
        setIsEditing(false);
        setError(null);
      } catch (err) {
        console.error('Error saving profile:', err);
        setError('Failed to save profile. Please try again.');
      }
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-4 bg-blue-500 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white">Your Profile</h2>
            <button
              onClick={logout}
              className="px-4 py-2 bg-white text-blue-500 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Sign Out
            </button>
          </div>

          <div className="p-6">
            <div className="flex flex-col md:flex-row gap-8">
              <div className="flex-shrink-0">
                <Image
                  src={profile.photoURL || '/default-avatar.png'}
                  alt="Profile"
                  width={128}
                  height={128}
                  className="rounded-full border-4 border-blue-500"
                />
              </div>

              <div className="flex-grow">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedProfile.name}
                        onChange={(e) =>
                          setEditedProfile({ ...editedProfile, name: e.target.value })
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="mt-1 text-gray-900">{profile.name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <p className="mt-1 text-gray-900">{profile.email}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Bio</label>
                    {isEditing ? (
                      <textarea
                        value={editedProfile.bio}
                        onChange={(e) =>
                          setEditedProfile({ ...editedProfile, bio: e.target.value })
                        }
                        rows={4}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="mt-1 text-gray-900">{profile.bio || 'No bio yet'}</p>
                    )}
                  </div>

                  <div className="flex gap-4">
                    {isEditing ? (
                      <>
                        <button
                          onClick={handleSave}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                        >
                          Save Changes
                        </button>
                        <button
                          onClick={() => {
                            setIsEditing(false);
                            setEditedProfile(profile);
                          }}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        Edit Profile
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <ImageUpload />
      </div>
    </div>
  );
}
