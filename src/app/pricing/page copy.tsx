'use client';

import React from 'react';
import PricingButton from '@/components/PricingButton';

interface PricingPlan {
  title: string;
  price: string;
  creditsInfo: string;
  description?: string;
}

// Pricing details inspired by @credit.ts interface
// Free Tier corresponds to free: 50
// Essential Monthly corresponds to monthly: 1000
// One-Time 1000 corresponds to onetime: 1000
const pricingPlans: PricingPlan[] = [
  {
    title: 'Free Tier',
    price: 'Free',
    creditsInfo: '50 credits',
    description: 'Start with a free bonus of credits.',
  },
  {
    title: 'Essential Monthly',
    price: '$4 / month',
    creditsInfo: '1000 credits',
    description: 'Enjoy a monthly boost of credits to keep you going.',
  },
  {
    title: 'One-Time 1000',
    price: '$5 one-time',
    creditsInfo: '1000 credits',
    description: 'Get an instant boost of credits in a one-time purchase.',
  },
];

const PricingPage = () => {
  const handleChoosePlan = async (plan: PricingPlan) => {
    try {
      // Create a unique order ID
      const orderId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Convert price to VND (assuming $1 = 24,000 VND)
      let amountInVND = 0;
      if (plan.title === 'Essential Monthly') {
        amountInVND = 96000; // $4 * 24000
      } else if (plan.title === 'One-Time 1000') {
        amountInVND = 120000; // $5 * 24000
      }

      if (amountInVND > 0) {
        const response = await fetch('/api/payment/create-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: amountInVND,
            orderId: orderId,
          }),
          redirect: 'manual'
        });

        const data = await response.json();
        if (data.url) {
          // Redirect to VNPay payment page
          window.location.href = data.url;
        } else {
          console.error('Payment creation failed');
        }
      }
    } catch (error) {
      console.error('Payment error:', error);
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-6 text-center">Pricing Plans</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {pricingPlans.map((plan, index) => (
            <div key={index} className="bg-white rounded-lg shadow p-6 flex flex-col">
              <h2 className="text-2xl font-semibold mb-4 text-center">{plan.title}</h2>
              <p className="text-center text-xl font-bold mb-2">{plan.price}</p>
              <p className="text-center text-gray-600 mb-4">{plan.creditsInfo}</p>
              {plan.description && (
                <p className="text-center text-gray-500 mb-6">{plan.description}</p>
              )}
              <PricingButton
                plan={plan}
                onClick={handleChoosePlan}
              />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
};

export default PricingPage;
