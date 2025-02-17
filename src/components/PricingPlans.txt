import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';

if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
  throw new Error('Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY');
}

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

export function PricingPlans({ userId }: { userId: string }) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (planType: 'monthly' | 'onetime') => {
    try {
      setLoading(planType);
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planType,
          userId,
        }),
      });

      const { sessionId } = await response.json();
      const stripe = await stripePromise;
      await stripe?.redirectToCheckout({ sessionId });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
      {/* Free Tier */}
      <div className="border rounded-lg p-6 bg-white shadow-sm">
        <h3 className="text-xl font-bold mb-4">Free Tier</h3>
        <p className="text-gray-600 mb-4">Start with 50 free credits</p>
        <ul className="space-y-2 mb-6">
          <li>✓ 50 credits included</li>
          <li>✓ Basic features</li>
          <li>✓ No credit card required</li>
        </ul>
        <button
          className="w-full bg-gray-100 text-gray-800 py-2 rounded-md"
          disabled
        >
          Current Plan
        </button>
      </div>

      {/* Essential Monthly */}
      <div className="border rounded-lg p-6 bg-white shadow-sm">
        <h3 className="text-xl font-bold mb-4">Essential Monthly</h3>
        <p className="text-2xl font-bold mb-4">$4/month</p>
        <ul className="space-y-2 mb-6">
          <li>✓ 1000 credits monthly</li>
          <li>✓ Includes Free Tier benefits</li>
          <li>✓ Premium support</li>
        </ul>
        <button
          className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
          onClick={() => handleSubscribe('monthly')}
          disabled={loading === 'monthly'}
        >
          {loading === 'monthly' ? 'Processing...' : 'Subscribe Monthly'}
        </button>
      </div>

      {/* One-Time Package */}
      <div className="border rounded-lg p-6 bg-white shadow-sm">
        <h3 className="text-xl font-bold mb-4">One-Time Package</h3>
        <p className="text-2xl font-bold mb-4">$5 one-time</p>
        <ul className="space-y-2 mb-6">
          <li>✓ 1000 credits</li>
          <li>✓ Includes Free Tier benefits</li>
          <li>✓ Never expires</li>
        </ul>
        <button
          className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700"
          onClick={() => handleSubscribe('onetime')}
          disabled={loading === 'onetime'}
        >
          {loading === 'onetime' ? 'Processing...' : 'Buy Credits'}
        </button>
      </div>
    </div>
  );
}
