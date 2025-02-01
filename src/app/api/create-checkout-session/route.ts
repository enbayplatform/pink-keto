import { createCheckoutSession } from '@/lib/stripe';

export async function POST(request: Request) {
  try {
    const { planType, userId } = await request.json();

    let priceId: string;
    let mode: 'subscription' | 'payment';

    // You'll need to create these products and prices in your Stripe dashboard
    // and replace these IDs with your actual Stripe price IDs
    if (planType === 'monthly') {
      priceId = process.env.STRIPE_MONTHLY_PRICE_ID!;
      mode = 'subscription';
    } else {
      priceId = process.env.STRIPE_ONETIME_PRICE_ID!;
      mode = 'payment';
    }

    const session = await createCheckoutSession({
      priceId,
      userId,
      mode,
    });

    return new Response(JSON.stringify({ sessionId: session.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return new Response(
      JSON.stringify({ error: 'Error creating checkout session' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
