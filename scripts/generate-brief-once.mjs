// One-off script to generate a brief for a given submission ID.
// Usage: node scripts/generate-brief-once.mjs <submissionId>
//
// Reads .env.local directly, so no dev server needed.

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ── Load .env.local ──────────────────────────────────────────
const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dir, '../.env.local');
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
  const clean = line.trim();
  if (!clean || clean.startsWith('#')) continue;
  const eq = clean.indexOf('=');
  if (eq === -1) continue;
  const key = clean.slice(0, eq).trim();
  const val = clean.slice(eq + 1).trim();
  if (!process.env[key]) process.env[key] = val;
}

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const submissionId = process.argv[2];
if (!submissionId) { console.error('Usage: node scripts/generate-brief-once.mjs <submissionId>'); process.exit(1); }

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://guide.trydetour.com';

// ── Load submission ──────────────────────────────────────────
console.log(`Loading submission ${submissionId}...`);
const { data: submission, error: loadErr } = await supabase.from('submissions').select('*').eq('id', submissionId).single();
if (loadErr || !submission) { console.error('Could not load submission:', loadErr); process.exit(1); }
console.log(`Loaded: ${submission.first_name}, ${submission.email}`);

// ── Mark generating ──────────────────────────────────────────
await supabase.from('submissions').update({ brief_generation_status: 'generating' }).eq('id', submissionId);

// ── Helpers ──────────────────────────────────────────────────
function tripNights(d1, d2) { return Math.round((new Date(d2) - new Date(d1)) / 86400000); }
function fmtDate(iso) { return iso ? new Date(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : ''; }
function groupDesc(s) {
  const map = { solo:'travelling solo', couple:'travelling as a couple', 'family-young':`with young children (${s.kids_ages||'young kids'})`, 'family-teens':`with teenagers`, friends:'in a group of friends', work:'on a work trip' };
  return map[s.group_type] ?? s.group_type;
}
function destCtx(s) {
  if (s.destination_choice === 'specific') return `The traveller has specifically requested ${s.destination_hint}. Build the full itinerary around this. Still provide 2 alternatives for comparison.`;
  if (s.destination_choice === 'region') return `The traveller is interested in ${s.destination_hint}. Pick the single best country/city within that region for their profile.`;
  return `The traveller is fully open. Pick the 3 best destinations in the world for their profile, considering seasonality for their travel dates.`;
}
function dietCtx(d) { return (!d||!d.length||d.includes('none')) ? 'No dietary restrictions.' : `Dietary requirements: ${d.join(', ')}. All food picks must respect these.`; }
function mobCtx(m) { if (!m||m==='none') return ''; if (m==='some') return 'Some mobility considerations.'; return 'Requires full accessibility compliance.'; }

const nights = tripNights(submission.departure_date, submission.return_date);

const SYSTEM = `You are Detour's expert travel researcher. Produce a fully personalised trip brief for a paying customer. This will be rendered into a beautifully designed interactive web page.

PRINCIPLES: Hyper-personalisation. Specificity (name real places). Honest trade-offs. Seasonality matters. Match their energy. JSON ONLY — first char must be { last must be }.`;

const USER = `Generate a complete personalised trip brief. Return ONLY valid JSON.

TRAVELLER PROFILE
Name: ${submission.first_name}
Group: ${groupDesc(submission)}
Departing from: ${submission.departure_city}
Travel dates: ${fmtDate(submission.departure_date)} → ${fmtDate(submission.return_date)} (${nights} nights)
Budget per person (excl. flights): $${(submission.budget_per_person||0).toLocaleString()} USD
Trip goals: ${(submission.trip_goals||[]).join(', ')||'not specified'}
Pace: ${submission.pace||'balanced'}
Accommodation style: ${(submission.accommodation_style||[]).join(', ')||'not specified'}
${dietCtx(submission.dietary)}
${mobCtx(submission.mobility)?`Mobility: ${mobCtx(submission.mobility)}`:''}
Important to them: ${(submission.priorities||[]).join(', ')||'nothing specific'}

DESTINATION CONTEXT
${destCtx(submission)}

QUALITATIVE INPUTS (use these to personalise everything)
Dream day: "${submission.dream_day||'Not provided'}"
Past trips loved: "${submission.past_trips||'Not provided'}"
Things to avoid: "${submission.avoid||'Nothing specific'}"
Other notes: "${submission.other_notes||'Nothing.'}"

INSTRUCTIONS
- 3 destinations: rank 1 = top pick (build itinerary here), rank 2 = alternative, rank 3 = wildcard
- Each "why" references at least 2 specific things from their qualitative inputs
- Scores 0-100: be honest, don't give everything 90+
- Itinerary: all ${nights} nights, day 1 gentle (jet lag), mirror dream day rhythm
- 3 accommodation options (real named properties): top_pick / best_value / splurge
- 6-8 restaurants: min 4 non-tourist, at least 1 hidden gem; ${dietCtx(submission.dietary)}
- Practical: visa specific to ${submission.departure_city}, name specific SIM carrier and app (Bolt/Grab etc.)
- Budget: 5-6 lines + total, realistic to $${submission.budget_per_person} budget
- personalised_highlights: 3 bullets that will specifically delight THIS traveller

OUTPUT JSON SCHEMA:
{
  "traveller_name": "${submission.first_name}",
  "destination_chosen": "",
  "trip_duration_nights": ${nights},
  "destinations": [{"rank":1,"label":"top_pick","name":"","country":"","region":"","why":"","tags":[],"best_time_to_visit":"","scores":{"safety":0,"value":0,"match":0}},{"rank":2,"label":"alternative","name":"","country":"","region":"","why":"","tags":[],"best_time_to_visit":"","scores":{"safety":0,"value":0,"match":0}},{"rank":3,"label":"wildcard","name":"","country":"","region":"","why":"","tags":[],"best_time_to_visit":"","scores":{"safety":0,"value":0,"match":0}}],
  "itinerary": [{"day":1,"date":"","title":"","base":"","activities":[{"time":"","title":"","description":"","type":"activity","tip":""}]}],
  "accommodation": [{"tier":"top_pick","name":"","neighbourhood":"","why":"","price_per_night_usd":"","booking_guidance":""},{"tier":"best_value","name":"","neighbourhood":"","why":"","price_per_night_usd":"","booking_guidance":""},{"tier":"splurge","name":"","neighbourhood":"","why":"","price_per_night_usd":"","booking_guidance":""}],
  "restaurants": [{"name":"","cuisine":"","why":"","price_level":"$$","dietary_note":"","best_for":""}],
  "hidden_gems": [],
  "practical": {"visa":"","health_vaccinations":"","sim_connectivity":"","getting_around":"","money_currency":"","weather_in_travel_month":"","packing_tips":"","safety_notes":""},
  "budget_breakdown": [{"category":"","notes":"","estimated_cost_usd":"","is_total":false}],
  "local_tip": "",
  "personalised_highlights": ["","",""]
}`;

// ── Call Claude ──────────────────────────────────────────────
console.log('Calling Claude claude-sonnet-4-6...');
const response = await client.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 16000,
  system: SYSTEM,
  messages: [{ role: 'user', content: USER }],
});

const raw = response.content[0]?.type === 'text' ? response.content[0].text : '';
const clean = raw.replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/```\s*$/i,'').trim();

let brief;
try {
  brief = JSON.parse(clean);
} catch(e) {
  console.error('JSON parse failed:', raw.slice(0,300));
  await supabase.from('submissions').update({ brief_generation_status: 'failed' }).eq('id', submissionId);
  process.exit(1);
}

console.log(`✓ Brief generated: ${brief.destination_chosen}`);

// ── Save to Supabase ─────────────────────────────────────────
const { error: saveErr } = await supabase.from('submissions').update({
  brief_data: brief,
  brief_generation_status: 'done',
  brief_generated_at: new Date().toISOString(),
  status: 'delivered',
}).eq('id', submissionId);

if (saveErr) { console.error('Save error:', saveErr); process.exit(1); }
console.log('✓ Saved to Supabase');

// ── Send delivery email ──────────────────────────────────────
const briefUrl = `${BASE_URL}/brief/${submissionId}`;
const highlights = (brief.personalised_highlights || []).map(h => `<li style="padding:8px 0;border-bottom:1px solid #f5f0e8;padding-left:20px;position:relative;font-size:14px;color:#4a4640;line-height:1.5"><span style="color:#c8874a;position:absolute;left:0;font-size:10px;top:10px">✦</span>${h}</li>`).join('');

await resend.emails.send({
  from: 'Detour <hello@trydetour.com>',
  to: [submission.email],
  subject: `Your ${brief.destination_chosen} trip brief is ready`,
  html: `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body style="font-family:-apple-system,sans-serif;background:#f5f0e8;margin:0;padding:24px;color:#1a1814">
<div style="background:white;border-radius:16px;padding:40px;max-width:560px;margin:0 auto;border:1px solid #ddd8ce">
  <div style="font-size:22px;font-weight:600;margin-bottom:32px">Detour</div>
  <div style="display:inline-block;background:#c8874a;color:white;border-radius:999px;padding:6px 16px;font-size:13px;font-weight:500;margin-bottom:24px">✦ Your trip brief is ready</div>
  <h1 style="font-size:26px;font-weight:600;margin:0 0 12px;line-height:1.25">Your ${brief.destination_chosen} brief is waiting, ${submission.first_name}.</h1>
  <p style="font-size:15px;color:#4a4640;line-height:1.7;margin:0 0 20px">We've built your personalised trip plan — here's a taste of what's inside.</p>
  <p style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#c8874a;font-weight:600;margin:28px 0 12px">Three things you'll love</p>
  <ul style="padding:0;margin:0 0 28px;list-style:none">${highlights}</ul>
  <div style="text-align:center;margin:32px 0"><a href="${briefUrl}" style="display:inline-block;background:#1a1814;color:white;padding:16px 36px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px">Open your trip brief →</a></div>
  <hr style="border:none;border-top:1px solid #ddd8ce;margin:28px 0"/>
  <p style="font-size:13px;color:#9a9490;line-height:1.6;margin:0 0 20px">Not happy with something? Reply within 7 days and we'll rebuild any section at no charge.</p>
</div>
<p style="text-align:center;font-size:12px;color:#9a9490;margin-top:24px">trydetour.com · hello@trydetour.com</p>
</body></html>`,
});

console.log(`✓ Delivery email sent to ${submission.email}`);
console.log(`\n🎉 Done! Brief URL: ${briefUrl}`);
