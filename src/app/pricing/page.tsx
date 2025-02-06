// src/app/pricing/page.tsx
'use client';

import { useState } from 'react';
// import { Plan } from '@/types'; // Ensure this type exists
export interface PricingPlan {
  id: string;
  title: string;
  price: number;
  features: string[];
  // description?: string;
}


const plans: PricingPlan[] = [
  {
    id: 'free',
    title: 'Free Tier',
    price: 0,
    features: ['50 credits', 'Basic features', 'Community support']
  },
  {
    id: 'essential',
    title: 'Essential Monthly',
    price: 4,
    features: ['1000 credits/month', 'Premium features', 'Priority support']
  },
  {
    id: 'onetime',
    title: 'One-Time 1000',
    price: 5,
    features: ['1000 credits', 'Lifetime access', 'Priority support']
  }
];

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);

  const handlePayment = async (plan: PricingPlan) => {
    if (plan.id === 'free') {
        // Handle free tier signup
        return;
    }

    try {
        setLoading(plan.id);
        const response = await fetch('/api/payment?fn=createpayment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                amount: 119000,
                orderDescription: `${plan.id}-credits`,
                orderType: plan.id,
                language: 'vn',
                paymentMethod: 'vnpay'
            }),
        });

        const data = await response.json();
        if (data.url) {
            window.location.href = data.url;
        } else {
            throw new Error('Failed to create payment URL');
        }
    } catch (error) {
        console.error('Payment error:', error);
        alert('Failed to process payment. Please try again.');
    } finally {
        setLoading(null);
    }
};

  return (
    <div className="max-w-6xl mx-auto py-12 px-4">
      <h1 className="text-4xl font-bold text-center mb-8">Choose Your Plan</h1>
      <div className="grid md:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <div key={plan.id} className="border rounded-lg p-6 shadow-lg">
            <h2 className="text-2xl font-bold mb-4">{plan.title}</h2>
            <p className="text-4xl font-bold mb-6">
              ${plan.price}
              <span className="text-lg text-gray-500">/month</span>
            </p>
            <ul className="mb-8 space-y-2">
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
              disabled={!!loading || plan.price === 0}
              className={`w-full py-3 rounded-lg transition-colors ${
                plan.price === 0
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              } ${
                loading === plan.id ? 'opacity-75 cursor-wait' : ''
              }`}
            >
              {plan.price === 0 ? 'Current Plan' : loading === plan.id ? 'Processing...' : 'Choose Plan'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}