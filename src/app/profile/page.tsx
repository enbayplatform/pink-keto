'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getUserCredits, type UserCredits } from '@/lib/credit';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchWithAuth } from '@/lib/api';
import config from '@/config';

interface PricingPlan {
  id: string;
  title: string;
  price: number;
  priceVND: number;
  features: string[];
  disabled?: boolean;
}

const plans: PricingPlan[] = [
  {
    id: 'free',
    title: 'Free Tier',
    price: 0,
    priceVND: 0,
    features: ['50 credits/monthly', 'Basic features', 'Community support']
  },
  {
    id: 'onetime',
    title: 'One-Time',
    price: 4.99,
    priceVND: 120000,
    features: ['Free tier', '1000 credits', 'Lifetime access', 'Priority support'],
    disabled: true
  },
  {
    id: 'monthly',
    title: 'Essential Monthly',
    price: 3.99,
    priceVND: 100000,
    features: ['Free tier', '1000 credits/monthly', 'Premium features', 'Priority support'],
    disabled: true
  }
];

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [creditsLoading, setCreditsLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState<string | null>(null);
  const [currency, setCurrency] = useState<'USD' | 'VND'>('VND');
  const [showTooltip, setShowTooltip] = useState(false);

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

  const handlePayment = async (plan: PricingPlan) => {
    if (plan.id === 'free') {
      return;
    }

    if (!user) {
      router.push('/login');
    }

    try {
      setPaymentLoading(plan.id);
      const response = await fetchWithAuth(config.api.createpayment, {
        method: 'POST',
        // headers: {
        //   'Content-Type': 'application/json',
        // },
        body: {
          amount: plan.priceVND,
          planId: plan.id,
          userId: user?.uid,
          orderInfo: plan.id +'-'+ user?.uid+'-'+ plan.priceVND,
        },
      });

      // const data = await response.json();
      const data = await response.data;
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Failed to create payment URL');
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert('Failed to process payment. Please try again.');
    } finally {
      setPaymentLoading(null);
    }
  };

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
    <div className="p-6 max-w-4xl mx-auto">
      <button
        onClick={() => router.push('/dashboard')}
        className="mb-6 inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
      >
        <svg
          className="w-5 h-5 mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>
        Back to Dashboard
      </button>
      <h1 className="text-3xl font-bold mb-8">Profile</h1>
      <div className="bg-white rounded-lg shadow p-6 space-y-8">
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
                <div className="text-2xl font-bold">{credits.free}</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-purple-600 font-semibold">One-Time Credits</div>
                <div className="text-2xl font-bold">{credits.onetime}</div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-blue-600 font-semibold">Monthly Credits</div>
                <div className="text-2xl font-bold">{credits.monthly}</div>
              </div>
            </div>
          </div>
        )}

        {/* Pricing Plans Section */}
        <div className="border-t pt-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold">Add more credits</h3>
            <div className="flex items-center">
              <div className="relative mr-3">
                <button
                  onMouseEnter={() => setShowTooltip(true)}
                  onMouseLeave={() => setShowTooltip(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                  </svg>
                </button>
                {showTooltip && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-sm bg-gray-900 text-white rounded shadow-lg w-64 z-10">
                    <div className="relative">
                      Base price will be calculated between VND-USD using current exchange rates. Final USD prices may vary slightly from displayed amounts.
                      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-gray-900 rotate-45"></div>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-2 bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setCurrency('USD')}
                  className={`px-3 py-1 rounded ${
                    currency === 'USD'
                      ? 'bg-white text-pink-600 shadow'
                      : 'text-gray-600 hover:text-gray-800'
                  } transition-all`}
                >
                  USD
                </button>
                <button
                  onClick={() => setCurrency('VND')}
                  className={`px-3 py-1 rounded ${
                    currency === 'VND'
                      ? 'bg-white text-pink-600 shadow'
                      : 'text-gray-600 hover:text-gray-800'
                  } transition-all`}
                >
                  VND
                </button>
              </div>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div key={plan.id} className={`border rounded-lg p-6 shadow-lg hover:shadow-xl transition-shadow ${
                plan.disabled ? 'opacity-60' : ''
              }`}>
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl font-bold">{plan.title}</h2>
                  {plan.disabled && (
                    <span className="text-xs font-medium bg-gray-200 text-gray-600 px-2 py-1 rounded">
                      Coming Soon
                    </span>
                  )}
                </div>
                <p className="text-3xl font-bold mb-6">
                  {currency === 'VND' ? (
                    <>
                      {plan.priceVND.toLocaleString('vi-VN')}
                      <span className="text-lg text-gray-500">₫</span>
                    </>
                  ) : (
                    <>
                      ${plan.price}
                      <span className="text-lg text-gray-500"></span>
                    </>
                  )}
                </p>
                <ul className="mb-6 space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center">
                      <svg className="w-5 h-5 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handlePayment(plan)}
                  disabled={!!paymentLoading || plan.price === 0 || plan.disabled}
                  className={`w-full py-2 px-4 rounded-lg transition-colors ${
                    plan.price === 0
                      ? 'bg-gray-300 cursor-not-allowed'
                      : plan.disabled
                      ? 'bg-gray-300 cursor-not-allowed'
                      : paymentLoading === plan.id
                      ? 'bg-pink-400 cursor-wait'
                      : 'bg-pink-500 hover:bg-pink-600 text-white'
                  }`}
                >
                  {paymentLoading === plan.id ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin h-5 w-5 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                      Processing...
                    </div>
                  ) : (
                    plan.price === 0 ? 'Current Plan' : plan.disabled ? 'Coming Soon' : 'Buy Now'
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
