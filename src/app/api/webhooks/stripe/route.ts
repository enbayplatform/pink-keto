import { headers } from 'next/headers';
import { handleStripeWebhook } from '@/lib/stripe';

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = headers().get('stripe-signature');

    if (!signature) {
      return new Response('No signature', { status: 400 });
    }

    await handleStripeWebhook(body, signature);
    return new Response(null, { status: 200 });
  } catch (error) {
    console.error('Error in Stripe webhook:', error);
    return new Response('Webhook Error', { status: 400 });
  }
}
