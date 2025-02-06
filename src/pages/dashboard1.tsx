'use client';

import Dashboard from '@/components/Dashboard';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { homedir } from 'os';
import { useEffect } from 'react';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading) {
    console.log('user:', user);
    console.log('loading:', loading);


    return <div>Loading...</div>;
  }

  if (!user) {
    router.push('/login');

  }

  return (
    <DashboardLayout>
      <Dashboard />
    </DashboardLayout>
  );
}