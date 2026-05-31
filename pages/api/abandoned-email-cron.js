import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const resend = new Resend(process.env.RESEND_API_KEY);
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://guide.trydetour.com';

// Timing constants (ms)
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).end();

  const authHeader = req.headers.authorization;
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const now = new Date();

  // Fetch every active abandoned sequence
  const { data: submissions, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('status', 'received')
    .eq('abandoned_sequence_stopped', false);

  if (error) {
    console.error('[AbandonedCron] Supabase fetch error:', error);
    return res.status(500).json({ error: 'DB error' });
  }

  let sent = 0;
  let stopped = 0;

  for (const sub of submissions || []) {
    const outcome = await processSubmission(sub, now);
    if (outcome === 'sent') sent++;
    if (outcome === 'stopped') stopped++;
  }

  console.log(`[AbandonedCron] processed=${submissions?.length ?? 0} sent=${sent} stopped=${stopped}`);
  return res.status(200).json({ processed: submissions?.length ?? 0, sent, stopped });
}

async function processSubmission(sub, now) {
  const createdAt = new Date(sub.created_at);
  const departureDate = sub.departure_date ? new Date(sub.departure_date) : null;
  const email1SentAt = sub.abandoned_email_1_sent_at ? new Date(sub.abandoned_email_1_sent_at) : null;
  const email2SentAt = sub.abandoned_email_2_sent_at ? new Date(sub.abandoned_email_2_sent_at) : null;
  const email3SentAt = sub.abandoned_email_3_sent_at ? new Date(sub.abandoned_email_3_sent_at) : null;
  const email4SentAt = sub.abandoned_email_4_sent_at ? new Date(sub.abandoned_email_4_sent_at) : null;

  // ── Suppression: trip date already passed ──────────────────────────────────
  if (departureDate && departureDate < now) {
    await supabase
      .from('submissions')
      .update({ abandoned_sequence_stopped: true })
      .eq('id', sub.id);
    return 'stopped';
  }

  // ── Suppression: trip is within 48 hours → skip straight to Email 4 ────────
  const msUntilDeparture = departureDate ? departureDate - now : Infinity;
  if (msUntilDeparture <= 48 * HOUR) {
    if (!email4SentAt) {
      await sendEmail(4, sub);
      await supabase
        .from('submissions')
        .update({
          abandoned_email_4_sent_at: new Date().toISOString(),
          abandoned_sequence_stopped: true,
        })
        .eq('id', sub.id);
      return 'sent';
    }
    return 'noop';
  }

  // ── Normal sequence (one email per cron run, in order) ────────────────────

  // Email 1: 1 hour after abandonment
  if (!email1SentAt) {
    if (now - createdAt >= HOUR) {
      await sendEmail(1, sub);
      await supabase
        .from('submissions')
        .update({ abandoned_email_1_sent_at: new Date().toISOString() })
        .eq('id', sub.id);
      return 'sent';
    }
    return 'noop';
  }

  // Email 2: 24 hours after Email 1
  if (!email2SentAt) {
    if (now - email1SentAt >= DAY) {
      await sendEmail(2, sub);
      await supabase
        .from('submissions')
        .update({ abandoned_email_2_sent_at: new Date().toISOString() })
        .eq('id', sub.id);
      return 'sent';
    }
    return 'noop';
  }

  // Email 3: 72 hours after Email 1
  if (!email3SentAt) {
    if (now - email1SentAt >= 3 * DAY) {
      await sendEmail(3, sub);
      await supabase
        .from('submissions')
        .update({ abandoned_email_3_sent_at: new Date().toISOString() })
        .eq('id', sub.id);
      return 'sent';
    }
    return 'noop';
  }

  // Email 4: 7 days after Email 1
  if (!email4SentAt) {
    if (now - email1SentAt >= 7 * DAY) {
      await sendEmail(4, sub);
      await supabase
        .from('submissions')
        .update({
          abandoned_email_4_sent_at: new Date().toISOString(),
          abandoned_sequence_stopped: true,
        })
        .eq('id', sub.id);
      return 'sent';
    }
    return 'noop';
  }

  return 'noop';
}

async function sendEmail(emailNumber, sub) {
  const firstName = sub.first_name || 'there';
  const toEmail = sub.email;
  const submissionId = sub.id;
  const resumeUrl = `${BASE_URL}/form?resume=${submissionId}`;
  const unsubscribeUrl = `${BASE_URL}/api/unsubscribe?sid=${submissionId}`;

  const templates = {
    1: {
      subject: `You left something behind, ${firstName}`,
      html: buildEmail1(firstName, resumeUrl, unsubscribeUrl),
    },
    2: {
      subject: `What's inside your trip brief`,
      html: buildEmail2(firstName, resumeUrl, unsubscribeUrl),
    },
    3: {
      subject: `Someone who almost didn't book`,
      html: buildEmail3(firstName, resumeUrl, unsubscribeUrl),
    },
    4: {
      subject: `Closing your file, ${firstName}`,
      html: buildEmail4(firstName, sub, resumeUrl, unsubscribeUrl),
    },
  };

  const { subject, html } = templates[emailNumber];

  const { error } = await resend.emails.send({
    from: 'Detour <hello@trydetour.com>',
    to: [toEmail],
    subject,
    html,
  });

  if (error) {
    console.error(`[AbandonedCron] Email ${emailNumber} to ${toEmail} failed:`, error);
  } else {
    console.log(`[AbandonedCron] Email ${emailNumber} sent to ${toEmail}`);
  }
}

// ── Shared email wrapper ───────────────────────────────────────────────────────

function emailWrapper(bodyHtml, unsubscribeUrl) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');
  body { margin: 0; padding: 0; background: #f5f0e8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1814; }
  a { color: #c8874a; }
</style>
</head>
<body>
<div style="background:#f5f0e8; padding:32px 16px;">
  <div style="background:white; border-radius:16px; max-width:560px; margin:0 auto; border:1px solid #ddd8ce; overflow:hidden;">
    <div style="height:3px; background:#c8874a;"></div>
    <div style="padding:40px 44px 48px;">
      <div style="font-size:15px; font-weight:600; letter-spacing:0.06em; color:#1a1814; margin-bottom:32px;">
        <span style="display:inline-block; width:6px; height:6px; background:#c8874a; border-radius:50%; vertical-align:middle; margin-right:6px;"></span>Detour
      </div>
      ${bodyHtml}
    </div>
  </div>
  <p style="text-align:center; font-size:12px; color:#9a9490; margin-top:20px; line-height:1.6;">
    trydetour.com &middot; Made for travellers who have better things to do than plan.<br />
    <a href="${unsubscribeUrl}" style="color:#9a9490; text-decoration:underline;">Unsubscribe</a>
  </p>
</div>
</body>
</html>`;
}

function resumeBtn(url, label, dark = false) {
  const bg = dark ? '#1a1814' : '#c8874a';
  return `<a href="${url}" style="display:inline-block; background:${bg}; color:white; padding:14px 32px; border-radius:10px; font-size:15px; font-weight:500; text-decoration:none; letter-spacing:0.01em; margin:10px 0;">${label}</a>`;
}

function sign() {
  return `<div style="margin-top:32px; padding-top:22px; border-top:1px solid #ddd8ce;">
  <div style="font-size:18px; color:#1a1814; margin-bottom:2px;">The Detour team</div>
  <div style="font-size:13px; color:#9a9490; margin-bottom:10px;">trydetour.com</div>
  <div style="font-size:13px; color:#9a9490; display:flex; align-items:center; gap:5px; letter-spacing:0.05em;">
    <span style="display:inline-block; width:5px; height:5px; background:#c8874a; border-radius:50%; vertical-align:middle; margin-right:4px;"></span>Detour
  </div>
</div>`;
}

// ── Email 1: 1 hour — Frictionless return ─────────────────────────────────────

function buildEmail1(firstName, resumeUrl, unsubscribeUrl) {
  const body = `
<p style="font-size:20px; color:#1a1814; margin-bottom:20px;">Hi ${firstName},</p>

<p style="font-size:15px; color:#4a4640; line-height:1.8; margin-bottom:18px;">You started filling in your trip brief — then disappeared. Happens all the time. Life gets in the way.</p>

<p style="font-size:15px; color:#4a4640; line-height:1.8; margin-bottom:18px;">We've saved your progress. Click below to pick up exactly where you left off — your answers are still there.</p>

${resumeBtn(resumeUrl, 'Resume my brief →')}

<p style="font-size:13px; color:#9a9490; margin-top:6px;">Takes about 4 more minutes to complete.</p>

<hr style="border:none; border-top:1px solid #ddd8ce; margin:26px 0;" />

<p style="font-size:15px; color:#4a4640; line-height:1.8; margin-bottom:18px;">If you're still deciding whether it's worth it — here's the honest version.</p>

<p style="font-size:15px; color:#4a4640; line-height:1.8; margin-bottom:18px;">The brief costs $37. It takes us 24 hours to build. You get a fully personalised PDF with destination picks, a day-by-day itinerary, where to stay, restaurants worth going to, and everything practical. Built around your specific dates, group, budget, and travel style.</p>

<p style="font-size:15px; color:#4a4640; line-height:1.8; margin-bottom:18px;">Not a template. Not a ChatGPT dump. A proper plan.</p>

${sign()}`;

  return emailWrapper(body, unsubscribeUrl);
}

// ── Email 2: 24 hours — Show the product ──────────────────────────────────────

function buildEmail2(firstName, resumeUrl, unsubscribeUrl) {
  const body = `
<p style="font-size:20px; color:#1a1814; margin-bottom:20px;">${firstName},</p>

<p style="font-size:15px; color:#4a4640; line-height:1.8; margin-bottom:18px;">Yesterday you started building your trip brief. You haven't finished yet — so maybe you're not sure exactly what you'd be getting.</p>

<p style="font-size:15px; color:#4a4640; line-height:1.8; margin-bottom:18px;">Here's what lands in your inbox 24 hours after you complete the form:</p>

<div style="border:1px solid #ddd8ce; border-radius:12px; overflow:hidden; margin:22px 0;">
  <div style="background:#e8e0d0; padding:12px 18px; font-size:11px; letter-spacing:0.1em; text-transform:uppercase; color:#9a9490; font-weight:500;">What's inside your personalised PDF</div>
  <div style="padding:12px 18px; border-top:1px solid #ddd8ce; font-size:14px; color:#4a4640; line-height:1.5;">🗺&nbsp;&nbsp;<strong>3 destination picks</strong> — ranked and scored for your specific profile, with honest reasoning for each</div>
  <div style="padding:12px 18px; border-top:1px solid #ddd8ce; font-size:14px; color:#4a4640; line-height:1.5;">📅&nbsp;&nbsp;<strong>Day-by-day itinerary</strong> — full plan at your pace, built around your dream day description</div>
  <div style="padding:12px 18px; border-top:1px solid #ddd8ce; font-size:14px; color:#4a4640; line-height:1.5;">🏨&nbsp;&nbsp;<strong>Where to stay</strong> — 3 options at different price points in the right neighbourhood</div>
  <div style="padding:12px 18px; border-top:1px solid #ddd8ce; font-size:14px; color:#4a4640; line-height:1.5;">🍽&nbsp;&nbsp;<strong>Restaurants &amp; hidden gems</strong> — places locals actually eat, filtered for your dietary needs</div>
  <div style="padding:12px 18px; border-top:1px solid #ddd8ce; font-size:14px; color:#4a4640; line-height:1.5;">📋&nbsp;&nbsp;<strong>Practical logistics</strong> — visa, best SIM card, transport apps, weather, what to pack</div>
  <div style="padding:12px 18px; border-top:1px solid #ddd8ce; font-size:14px; color:#4a4640; line-height:1.5;">💸&nbsp;&nbsp;<strong>Budget breakdown</strong> — realistic per-person estimate based on your stated budget</div>
</div>

<p style="font-size:15px; color:#4a4640; line-height:1.8; margin-bottom:18px;">All of it personalised to your answers — your dates, your group, your pace, your budget. The form you started filling in is how we make it specific to you rather than generic to everyone.</p>

<div style="background:#f5e8d8; border-left:3px solid #c8874a; border-radius:0 8px 8px 0; padding:16px 20px; margin:22px 0; font-size:14px; color:#4a4640; line-height:1.7;">
  <strong style="color:#1a1814;">The part most people are surprised by:</strong> the qualitative questions in Step 4 — your dream day, past trips you loved, things you want to avoid. That's where the brief stops feeling like a list and starts feeling like someone actually listened.
</div>

${resumeBtn(resumeUrl, 'Finish my brief — $37 →')}

${sign()}`;

  return emailWrapper(body, unsubscribeUrl);
}

// ── Email 3: 72 hours — Social proof + objection ─────────────────────────────

function buildEmail3(firstName, resumeUrl, unsubscribeUrl) {
  const freshFormUrl = `${BASE_URL}/form`;
  const body = `
<p style="font-size:20px; color:#1a1814; margin-bottom:20px;">${firstName},</p>

<p style="font-size:15px; color:#4a4640; line-height:1.8; margin-bottom:18px;">Marta almost didn't finish her brief either.</p>

<p style="font-size:15px; color:#4a4640; line-height:1.8; margin-bottom:18px;">She'd been planning a solo trip to Portugal for three months. She had seventeen browser tabs open. She knew she was overthinking it but couldn't stop. She started the Detour form, got to the payment screen, and closed the tab — <em>"I can probably just figure it out myself."</em></p>

<p style="font-size:15px; color:#4a4640; line-height:1.8; margin-bottom:18px;">She came back two days later. Finished the form. Paid the $37.</p>

<div style="background:#faf7f2; border:1px solid #ddd8ce; border-radius:10px; padding:18px 20px; margin:22px 0;">
  <div style="color:#c8874a; font-size:13px; letter-spacing:2px; margin-bottom:8px;">★★★★★</div>
  <div style="font-size:17px; color:#4a4640; line-height:1.55; margin-bottom:10px; font-style:italic;">"I'd been going in circles for weeks. The brief arrived and it was genuinely better than anything I'd built across all those tabs. I booked flights the same afternoon. The restaurant list alone was worth the $37 — every single place was exactly right."</div>
  <div style="font-size:12px; color:#9a9490;">— Marta S. · Solo trip · Lisbon &amp; Porto</div>
</div>

<p style="font-size:15px; color:#4a4640; line-height:1.8; margin-bottom:18px;">The thing that holds most people back at this point isn't the $37. It's the quiet suspicion that they should be able to do this themselves — that paying for a plan is somehow lazy, or that it won't be personalised enough to be worth it.</p>

<p style="font-size:15px; color:#4a4640; line-height:1.8; margin-bottom:18px;">You already gave us everything we need. The form you started has your dates, your group, your budget, your vibe. The brief we'd build from it would be specific to you — not a template with your name on it.</p>

${resumeBtn(resumeUrl, 'Finish and get my brief →')}

<a href="${freshFormUrl}" style="display:block; font-size:13px; color:#9a9490; margin-top:10px; text-decoration:underline; text-underline-offset:3px;">Start a fresh form instead →</a>

${sign()}`;

  return emailWrapper(body, unsubscribeUrl);
}

// ── Email 4: Day 7 — Urgency + close ─────────────────────────────────────────

function buildEmail4(firstName, sub, resumeUrl, unsubscribeUrl) {
  const departureDate = sub.departure_date
    ? new Date(sub.departure_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;
  const returnDate = sub.return_date
    ? new Date(sub.return_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;
  const datesLine = departureDate && returnDate
    ? `<strong>Your trip dates: ${departureDate} → ${returnDate}.</strong> There's still time — but not a lot of it.`
    : 'There\'s still time to sort this — but not a lot of it.';

  const body = `
<p style="font-size:20px; color:#1a1814; margin-bottom:20px;">${firstName},</p>

<p style="font-size:15px; color:#4a4640; line-height:1.8; margin-bottom:18px;">Last email from us.</p>

<p style="font-size:15px; color:#4a4640; line-height:1.8; margin-bottom:18px;">We've been holding your form progress for a week — your Step 1 answers, your travel dates, your departure city. We're about to clear it.</p>

<p style="font-size:15px; color:#4a4640; line-height:1.8; margin-bottom:18px;">If your trip is still happening, this is the last easy moment to sort the planning. After this, you're starting from scratch — and the 16 hours of research are all yours.</p>

<div style="background:#f5e8d8; border-left:3px solid #c8874a; border-radius:0 8px 8px 0; padding:16px 20px; margin:22px 0; font-size:14px; color:#4a4640; line-height:1.7;">
  <strong style="color:#1a1814;">Quick reminder of what $37 buys:</strong> A complete personalised trip plan delivered to your inbox in 24 hours. Destination picks, day-by-day itinerary, where to stay, restaurants, visa info, budget breakdown. Built around your exact answers — not a generic template.<br /><br />
  ${datesLine}
</div>

${resumeBtn(resumeUrl, 'Complete my brief — $37 →', true)}

<p style="font-size:13px; color:#9a9490; margin-top:10px;">This is the last email we'll send. Your form data will be cleared after today.</p>

<hr style="border:none; border-top:1px solid #ddd8ce; margin:26px 0;" />

<p style="font-size:14px; color:#9a9490; line-height:1.7;">If your plans changed and you're not travelling — no worries at all. Just ignore this and we won't bother you again.</p>

${sign()}`;

  return emailWrapper(body, unsubscribeUrl);
}
