import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// Stripe requires the raw body to verify the webhook signature.
// Next.js must NOT parse it as JSON first.
export const config = {
  api: { bodyParser: false },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

// Use the service role key to bypass RLS — safe because this only runs server-side.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

function labelGroupType(val) {
  const map = {
    solo: 'Solo', couple: 'Couple',
    'family-young': 'Family (young kids)', 'family-teens': 'Family (teens)',
    friends: 'Group of friends', work: 'Work trip',
  };
  return map[val] || val || '—';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const sig = req.headers['stripe-signature'];
  const rawBody = await getRawBody(req);

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const submissionId = session.metadata?.submission_id;
    const firstName = session.metadata?.first_name || '';
    const customerEmail = session.customer_details?.email || session.metadata?.customer_email_hint || '';
    const amountPaid = (session.amount_total / 100).toFixed(2);

    // ── 1. Pull the full submission from Supabase ──────────────────────────
    let submission = null;
    if (submissionId) {
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('id', submissionId)
        .single();

      if (error) {
        console.error('Supabase fetch error:', error);
      } else {
        submission = data;
      }

      // Mark as in_progress so you know it's paid and needs work
      const { error: updateError } = await supabase
        .from('submissions')
        .update({
          status: 'in_progress',
          stripe_session_id: session.id,
        })
        .eq('id', submissionId);

      if (updateError) {
        console.error('Supabase update error:', updateError);
      }
    }

    // ── 2. Build notification email HTML ───────────────────────────────────
    const name = submission?.first_name || firstName || 'Unknown';
    const email = submission?.email || customerEmail || '—';
    const departure = formatDate(submission?.departure_date);
    const returnDate = formatDate(submission?.return_date);
    const groupType = labelGroupType(submission?.group_type);
    const budget = submission?.budget_per_person ? `$${submission.budget_per_person.toLocaleString()}` : '—';
    const destChoice = submission?.destination_choice || '—';
    const destHint = submission?.destination_hint || '';
    const destination = destChoice === 'open'
      ? 'Open — surprise me'
      : `${destChoice === 'region' ? 'Region: ' : ''}${destHint || destChoice}`;
    const goals = (submission?.trip_goals || []).join(', ') || '—';
    const pace = submission?.pace || '—';
    const dreamDay = submission?.dream_day || '—';
    const avoid = submission?.avoid || '—';
    const supabaseUrl = `https://supabase.com/dashboard/project/wcxnzbyatpvwnbawemmx/editor`;

    const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f0e8; margin: 0; padding: 24px; color: #1a1814; }
  .card { background: white; border-radius: 16px; padding: 40px; max-width: 600px; margin: 0 auto; border: 1px solid #ddd8ce; }
  .badge { display: inline-block; background: #3d6b4f; color: white; border-radius: 999px; padding: 6px 16px; font-size: 13px; font-weight: 500; margin-bottom: 24px; }
  h1 { font-size: 26px; font-weight: 600; margin: 0 0 6px; }
  .sub { color: #9a9490; font-size: 14px; margin: 0 0 32px; }
  .section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #c8874a; font-weight: 600; margin: 0 0 12px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 28px; }
  td { padding: 10px 0; border-bottom: 1px solid #f5f0e8; font-size: 14px; vertical-align: top; }
  td:first-child { color: #9a9490; width: 40%; padding-right: 12px; }
  td:last-child { color: #1a1814; font-weight: 500; }
  .amount { font-size: 32px; font-weight: 700; color: #c8874a; }
  .divider { border: none; border-top: 1px solid #ddd8ce; margin: 24px 0; }
  .cta { display: inline-block; background: #c8874a; color: white; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 14px; margin-top: 8px; }
  .footer { text-align: center; font-size: 12px; color: #9a9490; margin-top: 24px; }
</style>
</head>
<body>
<div class="card">
  <div class="badge">✓ New order received</div>
  <h1>You have a new brief to build</h1>
  <p class="sub">Payment confirmed · $${amountPaid} USD · ${new Date().toLocaleString('en-GB', { timeZone: 'UTC', dateStyle: 'full', timeStyle: 'short' })} UTC</p>

  <p class="section-title">Customer</p>
  <table>
    <tr><td>Name</td><td>${name}</td></tr>
    <tr><td>Email</td><td>${email}</td></tr>
    <tr><td>Submission ID</td><td style="font-family:monospace;font-size:12px">${submissionId || '—'}</td></tr>
    <tr><td>Stripe Session</td><td style="font-family:monospace;font-size:12px">${session.id}</td></tr>
  </table>

  <p class="section-title">Trip Details</p>
  <table>
    <tr><td>Departure</td><td>${departure}</td></tr>
    <tr><td>Return</td><td>${returnDate}</td></tr>
    <tr><td>Departing from</td><td>${submission?.departure_city || '—'}</td></tr>
    <tr><td>Group type</td><td>${groupType}</td></tr>
    <tr><td>Budget per person</td><td>${budget}</td></tr>
    <tr><td>Destination</td><td>${destination}</td></tr>
    <tr><td>Trip goals</td><td>${goals}</td></tr>
    <tr><td>Pace</td><td>${pace}</td></tr>
  </table>

  <p class="section-title">The Magic Fields</p>
  <table>
    <tr><td>Dream day</td><td>${dreamDay}</td></tr>
    <tr><td>Things to avoid</td><td>${avoid}</td></tr>
    <tr><td>Past trips loved</td><td>${submission?.past_trips || '—'}</td></tr>
    <tr><td>Other notes</td><td>${submission?.other_notes || '—'}</td></tr>
  </table>

  <hr class="divider" />
  <p style="font-size:14px;color:#4a4640;margin:0 0 16px;">
    Open the Supabase dashboard to see the full submission and update the status as you work.
  </p>
  <a href="${supabaseUrl}" class="cta">Open Supabase →</a>
</div>
<p class="footer">This is an automated notification from trydetour.com</p>
</body>
</html>`;

    // ── 3. Send notification to the team ──────────────────────────────────
    const { error: emailError } = await resend.emails.send({
      from: 'Detour Orders <notifications@trydetour.com>',
      to: ['hello@trydetour.com', 'julianalert@gmail.com'],
      subject: `New order — ${name} · $${amountPaid} paid`,
      html,
    });

    if (emailError) {
      console.error('Resend error:', emailError);
    }
  }

  res.status(200).json({ received: true });
}
