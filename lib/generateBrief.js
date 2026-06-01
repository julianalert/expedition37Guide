import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── HELPERS ───────────────────────────────────────────────────────────────────

function tripDurationNights(departure, returnDate) {
  const d1 = new Date(departure);
  const d2 = new Date(returnDate);
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
}

function groupDescription(submission) {
  const map = {
    solo: 'travelling solo',
    couple: 'travelling as a couple',
    'family-young': `travelling as a family with young children (${submission.kids_ages || 'young kids'})`,
    'family-teens': `travelling as a family with teenagers (${submission.kids_ages || 'teens'})`,
    friends: 'travelling in a group of friends',
    work: 'on a work trip',
  };
  return map[submission.group_type] ?? submission.group_type;
}

function destinationContext(submission) {
  if (submission.destination_choice === 'specific')
    return `The traveller has specifically requested ${submission.destination_hint}. Build the full itinerary around this destination. Still provide 2 alternative destinations for context and comparison.`;
  if (submission.destination_choice === 'region')
    return `The traveller is interested in ${submission.destination_hint} as a region. Pick the single best country/city within that region for their profile as the top pick.`;
  return `The traveller is fully open. Pick the 3 best destinations in the world for their profile right now, considering seasonality for their travel dates.`;
}

function dietaryContext(dietary) {
  if (!dietary || !dietary.length || dietary.includes('none'))
    return 'No dietary restrictions.';
  return `Dietary requirements: ${dietary.join(', ')}. All restaurant picks and food recommendations must strictly respect these.`;
}

function mobilityContext(mobility) {
  if (!mobility || mobility === 'none') return '';
  if (mobility === 'some')
    return 'Has some mobility considerations — avoid recommendations requiring significant walking, stairs, or difficult terrain without flagging it.';
  return 'Requires full wheelchair/accessibility compliance. All recommendations must be fully accessible. Flag anything that may not be.';
}

// ── SYSTEM PROMPT ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are Detour's expert travel researcher — a world-class trip planner with deep, current knowledge of destinations worldwide.

Your job is to produce a single, fully personalised trip brief for a paying customer. The output will be rendered into a beautifully designed interactive web page and delivered to them within minutes of purchase.

CORE PRINCIPLES:

1. HYPER-PERSONALISATION — Every sentence must feel like it was written for this specific person. Reference their exact inputs: their dream day, their past trips, their group, their dietary needs, their pace preference. Generic travel blog copy is a failure.

2. SPECIFICITY OVER SAFETY — Name real places, real restaurants, real hotels, real streets. "A nice neighbourhood café" is useless. "Head to Café de Flore on Boulevard Saint-Germain — arrive before 9am to avoid the tourist wave" is what they paid for.

3. HONEST TRADE-OFFS — If a destination has a meaningful downside for this traveller's profile, mention it. If a restaurant is tourist-heavy but genuinely worth it, say so. Trust is built through candour, not cheerleading.

4. SEASONALITY MATTERS — Tailor every recommendation to the actual travel dates. Don't recommend a destination during its rainy season without acknowledging it. Don't suggest cherry blossoms in August.

5. MATCH THEIR ENERGY — If they want slow and relaxed, don't pack the itinerary. If they said "see everything", push the pace. Mirror their dream day description in tone and content.

6. JSON ONLY — Return ONLY the JSON object. No preamble, no explanation, no markdown fences. The first character of your response must be { and the last must be }.

OUTPUT QUALITY BAR — Before finalising, ask yourself: if this traveller showed this brief to a friend who knew the destination well, would that friend say "wow, these are exactly the right picks"? If not, revise.`;

// ── USER PROMPT ───────────────────────────────────────────────────────────────

export function buildUserPrompt(submission) {
  const nights = tripDurationNights(submission.departure_date, submission.return_date);
  const group = groupDescription(submission);
  const destContext = destinationContext(submission);
  const dietaryNote = dietaryContext(submission.dietary);
  const mobilityNote = mobilityContext(submission.mobility);

  return `
Generate a complete personalised trip brief for the following traveller. Return ONLY valid JSON matching the schema below.

═══════════════════════════════════════
TRAVELLER PROFILE
═══════════════════════════════════════

Name: ${submission.first_name}
Group: ${group}
Departing from: ${submission.departure_city}
Travel dates: ${formatDate(submission.departure_date)} → ${formatDate(submission.return_date)} (${nights} nights)
Budget per person (excl. flights): $${(submission.budget_per_person || 0).toLocaleString()} USD

Trip goals: ${(submission.trip_goals || []).join(', ') || 'not specified'}
Pace preference: ${submission.pace || 'balanced'}
Accommodation style: ${(submission.accommodation_style || []).join(', ') || 'not specified'}

${dietaryNote}
${mobilityNote ? `Mobility: ${mobilityNote}` : ''}

Important to them: ${(submission.priorities || []).length ? submission.priorities.join(', ') : 'nothing specific flagged'}

═══════════════════════════════════════
DESTINATION CONTEXT
═══════════════════════════════════════

${destContext}

═══════════════════════════════════════
QUALITATIVE INPUTS (most important — use these to personalise every section)
═══════════════════════════════════════

Their dream day on this trip:
"${submission.dream_day || 'Not provided'}"

Past trips they loved and why:
"${submission.past_trips || 'Not provided'}"

Things they want to avoid:
"${submission.avoid || 'Nothing specific'}"

Other notes:
"${submission.other_notes || 'Nothing additional provided.'}"

═══════════════════════════════════════
GENERATION INSTRUCTIONS
═══════════════════════════════════════

DESTINATIONS (3 total):
- Rank 1 is the top pick — build the full itinerary around this one
- Rank 2 is a genuine alternative with a different character
- Rank 3 is a wildcard — surprising but justifiable for their profile
- Each "why" must reference at least 2 specific things from their qualitative inputs
- Scores: safety/value/match each 0-100. Be honest — don't give everything 90+

ITINERARY (for top pick destination only):
- Cover all ${nights} nights / ${nights + 1} days
- Day 1 should be gentle — they just arrived, possibly jet-lagged
- Build around their dream day description — echo its rhythm and priorities
- Include at least one meal recommendation per day
- Time slots: Morning / Midday / Afternoon / Evening (not exact clock times unless transport)
- Don't fill every slot — leave breathing room if pace is "slow" or "balanced"
- If pace is "packed", push hard but keep it realistic

ACCOMMODATION (3 options):
- top_pick: best overall fit for their style and budget
- best_value: meaningfully cheaper, explain the trade-off honestly
- splurge: what they'd book if budget wasn't a factor — make it aspirational
- Each must be a real, named property in the correct neighbourhood

RESTAURANTS (6-8 picks total):
- Minimum 4 must be non-tourist-trap local spots
- Cover breakfast, lunch, dinner, and a drinks/snack pick
- ${dietaryNote}
- At least 1 must be a hidden gem most visitors would miss

PRACTICAL INFO:
- Visa: be specific to ${submission.departure_city} — don't give generic advice
- SIM: name specific carrier and current best option
- Getting around: specific app names (Bolt, Grab, etc.) not generic "use taxis"
- Weather: be specific to the exact travel month, not a generic seasonal description
- Packing tips: 3 specific items relevant to their trip type and season

BUDGET BREAKDOWN:
- Calculate against their stated budget of $${submission.budget_per_person}
- Be realistic — don't underestimate to make numbers look good
- Include 5-6 line items + a total

PERSONALISED HIGHLIGHTS (for delivery email):
- 3 short bullets (1 sentence each) that will excite them specifically
- Reference their specific inputs — not generic highlights
- These are the 3 things from the brief they'll be most surprised or delighted by

═══════════════════════════════════════
OUTPUT SCHEMA
═══════════════════════════════════════

{
  "traveller_name": "${submission.first_name}",
  "destination_chosen": "",
  "trip_duration_nights": ${nights},
  "destinations": [
    {
      "rank": 1,
      "label": "top_pick",
      "name": "",
      "country": "",
      "region": "",
      "why": "",
      "tags": [],
      "best_time_to_visit": "",
      "scores": { "safety": 0, "value": 0, "match": 0 }
    },
    {
      "rank": 2,
      "label": "alternative",
      "name": "",
      "country": "",
      "region": "",
      "why": "",
      "tags": [],
      "best_time_to_visit": "",
      "scores": { "safety": 0, "value": 0, "match": 0 }
    },
    {
      "rank": 3,
      "label": "wildcard",
      "name": "",
      "country": "",
      "region": "",
      "why": "",
      "tags": [],
      "best_time_to_visit": "",
      "scores": { "safety": 0, "value": 0, "match": 0 }
    }
  ],
  "itinerary": [
    {
      "day": 1,
      "date": "",
      "title": "",
      "base": "",
      "activities": [
        {
          "time": "",
          "title": "",
          "description": "",
          "type": "activity",
          "tip": ""
        }
      ]
    }
  ],
  "accommodation": [
    {
      "tier": "top_pick",
      "name": "",
      "neighbourhood": "",
      "why": "",
      "price_per_night_usd": "",
      "booking_guidance": ""
    },
    {
      "tier": "best_value",
      "name": "",
      "neighbourhood": "",
      "why": "",
      "price_per_night_usd": "",
      "booking_guidance": ""
    },
    {
      "tier": "splurge",
      "name": "",
      "neighbourhood": "",
      "why": "",
      "price_per_night_usd": "",
      "booking_guidance": ""
    }
  ],
  "restaurants": [
    {
      "name": "",
      "cuisine": "",
      "why": "",
      "price_level": "$$",
      "dietary_note": "",
      "best_for": ""
    }
  ],
  "hidden_gems": [],
  "practical": {
    "visa": "",
    "health_vaccinations": "",
    "sim_connectivity": "",
    "getting_around": "",
    "money_currency": "",
    "weather_in_travel_month": "",
    "packing_tips": "",
    "safety_notes": ""
  },
  "budget_breakdown": [
    {
      "category": "",
      "notes": "",
      "estimated_cost_usd": "",
      "is_total": false
    }
  ],
  "local_tip": "",
  "personalised_highlights": ["", "", ""]
}
`;
}

// ── VALIDATION ────────────────────────────────────────────────────────────────

function validateBrief(brief) {
  const errors = [];

  if (!brief.destinations || brief.destinations.length < 3)
    errors.push('Missing destinations (need 3)');

  if (!brief.itinerary || brief.itinerary.length === 0)
    errors.push('Missing itinerary');

  if (!brief.accommodation || brief.accommodation.length < 3)
    errors.push('Missing accommodation options (need 3)');

  if (!brief.restaurants || brief.restaurants.length < 4)
    errors.push('Missing restaurants (need at least 4)');

  if (!brief.practical?.visa)
    errors.push('Missing practical info');

  if (!brief.budget_breakdown || brief.budget_breakdown.length === 0)
    errors.push('Missing budget breakdown');

  if (!brief.personalised_highlights || brief.personalised_highlights.length < 3)
    errors.push('Missing personalised_highlights (need 3)');

  if (errors.length > 0)
    throw new Error(`Brief validation failed: ${errors.join(', ')}`);

  // Warn on suspiciously perfect scores — doesn't throw, just logs
  (brief.destinations || []).forEach((d, i) => {
    if (d.scores?.match > 98 || d.scores?.safety > 98 || d.scores?.value > 98) {
      console.warn(`[generateBrief] Destination ${i + 1} has suspiciously perfect scores`);
    }
  });
}

// ── CORE GENERATE ─────────────────────────────────────────────────────────────

export async function generateBrief(submission) {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildUserPrompt(submission) }],
  });

  const raw = response.content[0]?.type === 'text' ? response.content[0].text : '';

  // Strip any accidental markdown fences
  const clean = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(clean);
  } catch {
    console.error('[generateBrief] Unparseable JSON:', raw.slice(0, 500));
    throw new Error(`JSON parse error. Raw output started with: ${raw.slice(0, 200)}`);
  }

  validateBrief(parsed);
  return parsed;
}

// ── RETRY WRAPPER ─────────────────────────────────────────────────────────────

export async function generateBriefWithRetry(submission, maxAttempts = 2) {
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const brief = await generateBrief(submission);
      if (attempt > 1) console.log(`[generateBrief] Succeeded on attempt ${attempt}`);
      return brief;
    } catch (err) {
      lastError = err;
      console.error(`[generateBrief] Attempt ${attempt} failed:`, err.message);
      if (attempt < maxAttempts) await new Promise((r) => setTimeout(r, 2000));
    }
  }

  throw new Error(`Brief generation failed after ${maxAttempts} attempts. Last: ${lastError?.message}`);
}
