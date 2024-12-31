import { auth } from '@/lib/firebase';
import config from '@/config';
// import { auth } from './firebase';

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
}

export async function fetchWithAuth(url: string, options: ApiOptions = {}) {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Not authenticated');
    }

    const token = await user.getIdToken();
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    console.error('API request failed:', error);
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
