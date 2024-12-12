'use client';

import { useAuth } from '@/context/AuthContext';
import LoginPage from '@/components/LoginPage';
import ProfilePage from '@/components/ProfilePage';

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return user ? <ProfilePage /> : <LoginPage />;
}