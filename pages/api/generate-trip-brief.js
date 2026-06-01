import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { generateBriefWithRetry } from '../../lib/generateBrief';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const resend = new Resend(process.env.RESEND_API_KEY);
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://guide.trydetour.com';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const authHeader = req.headers.authorization;
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { submissionId } = req.body;
  if (!submissionId) return res.status(400).json({ error: 'submissionId required' });

  // ── 1. Idempotency check ──────────────────────────────────────────────────
  const { data: current, error: fetchErr } = await supabase
    .from('submissions')
    .select('brief_generation_status, brief_data, first_name, email')
    .eq('id', submissionId)
    .single();

  if (fetchErr || !current) {
    console.error('[generate-trip-brief] Fetch error:', fetchErr);
    return res.status(404).json({ error: 'Submission not found' });
  }

  if (current.brief_generation_status === 'generating' || current.brief_generation_status === 'done') {
    console.log(`[generate-trip-brief] Skipping ${submissionId} — status: ${current.brief_generation_status}`);
    return res.status(200).json({ skipped: true, status: current.brief_generation_status });
  }

  // ── 2. Lock the row ───────────────────────────────────────────────────────
  await supabase
    .from('submissions')
    .update({ brief_generation_status: 'generating' })
    .eq('id', submissionId);

  // Respond immediately so Stripe / cron callers don't time out.
  // The rest runs as a fire-and-forget promise.
  res.status(202).json({ accepted: true, submissionId });

  // ── 3. Full pipeline (runs after response is sent) ────────────────────────
  runGeneration(submissionId).catch((err) => {
    console.error('[generate-trip-brief] Unhandled pipeline error:', err);
  });
}

async function runGeneration(submissionId) {
  // Load full row
  const { data: submission, error: loadErr } = await supabase
    .from('submissions')
    .select('*')
    .eq('id', submissionId)
    .single();

  if (loadErr || !submission) {
    console.error('[generate-trip-brief] Could not load submission:', loadErr);
    return;
  }

  let brief;
  try {
    brief = await generateBriefWithRetry(submission);
  } catch (err) {
    console.error('[generate-trip-brief] Generation failed:', err.message);
    await markFailed(submissionId, submission, err.message);
    return;
  }

  // ── Store brief_data ──────────────────────────────────────────────────────
  const { error: saveErr } = await supabase
    .from('submissions')
    .update({
      brief_data: brief,
      brief_generation_status: 'done',
      brief_generated_at: new Date().toISOString(),
      status: 'delivered',
    })
    .eq('id', submissionId);

  if (saveErr) {
    console.error('[generate-trip-brief] Save error:', saveErr);
    await markFailed(submissionId, submission, saveErr.message);
    return;
  }

  // ── Send delivery email ───────────────────────────────────────────────────
  const briefUrl = `${BASE_URL}/brief/${submissionId}`;
  const firstName = submission.first_name || 'there';
  const destination = brief.destination_chosen || brief.destinations?.[0]?.name || 'your destination';
  const highlights = brief.personalised_highlights || [];

  const highlightHtml = highlights
    .map((h) => `<li>${h}</li>`)
    .join('');

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f0e8; margin: 0; padding: 24px; color: #1a1814; }
  .card { background: white; border-radius: 16px; padding: 40px; max-width: 560px; margin: 0 auto; border: 1px solid #ddd8ce; }
  .logo { font-size: 22px; font-weight: 600; letter-spacing: -0.02em; margin-bottom: 32px; color: #1a1814; }
  .badge { display: inline-block; background: #c8874a; color: white; border-radius: 999px; padding: 6px 16px; font-size: 13px; font-weight: 500; margin-bottom: 24px; }
  h1 { font-size: 26px; font-weight: 600; margin: 0 0 12px; line-height: 1.25; }
  p { font-size: 15px; color: #4a4640; line-height: 1.7; margin: 0 0 20px; }
  .section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #c8874a; font-weight: 600; margin: 28px 0 12px; }
  ul { padding: 0; margin: 0 0 28px; list-style: none; }
  li { font-size: 14px; color: #4a4640; padding: 8px 0; border-bottom: 1px solid #f5f0e8; padding-left: 20px; position: relative; line-height: 1.5; }
  li::before { content: '✦'; color: #c8874a; position: absolute; left: 0; font-size: 10px; top: 10px; }
  .cta-wrap { text-align: center; margin: 32px 0; }
  .cta { display: inline-block; background: #1a1814; color: white; padding: 16px 36px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 15px; }
  .note { font-size: 13px; color: #9a9490; line-height: 1.6; margin: 0 0 20px; }
  .divider { border: none; border-top: 1px solid #ddd8ce; margin: 28px 0; }
  .footer { text-align: center; font-size: 12px; color: #9a9490; margin-top: 24px; line-height: 1.6; }
</style>
</head>
<body>
<div class="card">
  <div class="logo">Detour</div>
  <div class="badge">✦ Your trip brief is ready</div>
  <h1>Your ${destination} brief is waiting, ${firstName}.</h1>
  <p>We've built your personalised trip plan — here's a taste of what's inside.</p>

  <p class="section-title">Three things you'll love</p>
  <ul>${highlightHtml}</ul>

  <div class="cta-wrap">
    <a href="${briefUrl}" class="cta">Open your trip brief →</a>
  </div>

  <hr class="divider" />

  <p class="note">
    Not happy with something? Reply to this email within 7 days and we'll rebuild any section at no charge.
  </p>
  <p class="note">
    Want us to handle everything — bookings, reservations, a WhatsApp line during your trip?
    Ask about our <strong>Concierge service</strong>.
  </p>
</div>
<p class="footer">
  trydetour.com · hello@trydetour.com<br />
  © ${new Date().getFullYear()} Detour
</p>
</body>
</html>`;

  const { error: emailErr } = await resend.emails.send({
    from: 'Detour <hello@trydetour.com>',
    to: [submission.email],
    subject: `Your ${destination} trip brief is ready`,
    html: emailHtml,
  });

  if (emailErr) {
    console.error('[generate-trip-brief] Delivery email error:', emailErr);
  }

  console.log(`[generate-trip-brief] Done for ${submissionId} — brief delivered to ${submission.email}`);
}

async function markFailed(submissionId, submission, reason) {
  await supabase
    .from('submissions')
    .update({ brief_generation_status: 'failed' })
    .eq('id', submissionId);

  // Alert the team
  await resend.emails.send({
    from: 'Detour Alerts <notifications@trydetour.com>',
    to: ['hello@trydetour.com'],
    subject: `⚠ Brief generation failed — ${submission?.first_name || submissionId}`,
    html: `
      <p>Brief generation failed for submission <strong>${submissionId}</strong>.</p>
      <p>Customer: ${submission?.first_name || '?'} (${submission?.email || '?'})</p>
      <p>Error: <code>${reason}</code></p>
      <p>Retry: <a href="${BASE_URL}/api/admin/retry-brief?sid=${submissionId}&secret=ADMIN_SECRET">
        ${BASE_URL}/api/admin/retry-brief?sid=${submissionId}&secret=...
      </a></p>
    `,
  }).catch(console.error);
}
