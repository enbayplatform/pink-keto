// src/app/pricing/page.tsx
'use client';

import { useState } from 'react';

interface PricingPlan {
    name: string;
    price: number;
    credits: number;
    type: 'free' | 'monthly' | 'one-time';
}

const pricingPlans: PricingPlan[] = [
    {
        name: 'Free Tier',
        price: 0,
        credits: 50,
        type: 'free'
    },
    {
        name: 'Essential Monthly',
        price: 4,
        credits: 1000,
        type: 'monthly'
    },
    {
        name: 'One-Time 1000',
        price: 5,
        credits: 1000,
        type: 'one-time'
    }
];

export default function PricingPage() {
    const [loading, setLoading] = useState(false);

    const handlePayment = async (plan: PricingPlan) => {
        if (plan.type === 'free') {
            // Handle free tier signup
            return;
        }

        try {
            setLoading(true);
            const response = await fetch('/api/payment/create-payment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    amount: plan.price,
                    orderDescription: `${plan.name} - ${plan.credits} credits`,
                    orderType: plan.type,
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
            setLoading(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <div className="text-center">
                <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                    Choose your plan
                </h2>
                <p className="mt-4 text-xl text-gray-600">
                    Select the plan that best fits your needs
                </p>
            </div>

            <div className="mt-12 grid gap-8 lg:grid-cols-3">
                {pricingPlans.map((plan) => (
                    <div
                        key={plan.name}
                        className="relative flex flex-col rounded-2xl border border-gray-200 p-8 shadow-sm"
                    >
                        <div className="flex-1">
                            <h3 className="text-xl font-semibold text-gray-900">
                                {plan.name}
                            </h3>
                            <p className="mt-4 flex items-baseline text-gray-900">
                                <span className="text-5xl font-extrabold tracking-tight">
                                    ${plan.price}
                                </span>
                                {plan.type === 'monthly' && (
                                    <span className="ml-1 text-xl font-semibold">/month</span>
                                )}
                            </p>
                            <p className="mt-6 text-gray-500">
                                {plan.credits} credits
                            </p>
                        </div>

                        <button
                            onClick={() => handlePayment(plan)}
                            disabled={loading}
                            className="mt-8 block w-full rounded-md border border-transparent bg-indigo-600 py-3 px-6 text-center font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {loading ? 'Processing...' : `Get ${plan.type === 'free' ? 'Started' : 'Credits'}`}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}