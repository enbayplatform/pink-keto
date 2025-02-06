'use client';

import { PricingPlan } from '@/types/pricing';

export default function PricingButton({
  plan,
  onClick
}: {
  plan: PricingPlan;
  onClick: (plan: PricingPlan) => void;
}) {
  return (
    <button
      onClick={() => onClick(plan)}
      className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
    >
      Choose {plan.title}
    </button>
  );
}
