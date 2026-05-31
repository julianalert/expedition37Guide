import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { submissionId, email, firstName } = req.body || {};

  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `https://${req.headers.host}`;

    const sessionParams = {
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Detour — Personalised Trip Brief',
              description:
                'Your fully personalised travel plan: destination picks, day-by-day itinerary, accommodation, restaurants, practical info & budget breakdown. Delivered as a beautifully designed PDF within 24 hours.',
            },
            unit_amount: 100,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${baseUrl}/thank-you?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/order`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      metadata: {
        product: 'detour-trip-brief',
        ...(submissionId && { submission_id: submissionId }),
        ...(firstName && { first_name: firstName }),
        ...(email && { customer_email_hint: email }),
      },
    };

    // Pre-fill the email field in Stripe Checkout so the user doesn't have to type it again
    if (email) {
      sessionParams.customer_email = email;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe error:', err);
    res.status(500).json({ error: err.message });
  }
}
