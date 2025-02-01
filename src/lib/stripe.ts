import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

export const STRIPE_PRODUCTS = {
  ESSENTIAL_MONTHLY: 'essential_monthly',
  ONE_TIME_1000: 'one_time_1000',
} as const;

export interface PriceWithProduct extends Stripe.Price {
  product: Stripe.Product;
}

export async function getSubscriptionPlans() {
  const { data: prices } = await stripe.prices.list({
    expand: ['data.product'],
    active: true,
  });

  return prices as PriceWithProduct[];
}

export async function createCheckoutSession({
  priceId,
  userId,
  mode,
}: {
  priceId: string;
  userId: string;
  mode: 'subscription' | 'payment';
}) {
  const session = await stripe.checkout.sessions.create({
    mode,
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/profile?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/profile?canceled=true`,
    metadata: {
      userId,
    },
  });

  return session;
}

export async function handleStripeWebhook(
  body: string,
  signature: string,
) {
  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        
        if (!userId) {
          throw new Error('No userId in session metadata');
        }

        // Handle the payment completion
        // You'll need to implement the credit addition logic here
        break;
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error handling webhook:', error);
    throw error;
  }
}
