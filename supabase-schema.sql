-- Run this in the Supabase SQL editor to create the submissions table.
-- Each row = one intake form submission = one trip brief to produce.

CREATE TABLE submissions (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at      timestamptz DEFAULT now(),

  -- Workflow status (update manually in Supabase as you work each brief)
  status          text        DEFAULT 'received'
                              CHECK (status IN ('received', 'in_progress', 'completed', 'delivered')),

  -- ── CONTACT ──────────────────────────────────────────────────────────────
  -- Brief uses: [CLIENT NAME], delivery email
  first_name      text,
  email           text        NOT NULL,

  -- ── TRIP BASICS ──────────────────────────────────────────────────────────
  -- Brief uses: [DATE RANGE], [X nights], [GROUP TYPE], [DEPARTING FROM]
  departure_date  date,
  return_date     date,
  departure_city  text,
  group_type      text        CHECK (group_type IN (
                                'solo', 'couple',
                                'family-young', 'family-teens',
                                'friends', 'work'
                              )),
  kids_ages       text,       -- only set when group_type is family-*

  -- ── TRAVEL STYLE ─────────────────────────────────────────────────────────
  -- Brief uses: destination scoring, itinerary tone, accommodation section
  trip_goals      text[],     -- relax | adventure | culture | food | nightlife
                              -- nature | wellness | city | romance
  pace            text        CHECK (pace IN ('slow', 'balanced', 'packed')),
  accommodation_style text[], -- budget | midrange | boutique | luxury | airbnb | unique
  budget_per_person   integer,  -- USD, excl. flights → drives budget breakdown table

  -- ── PREFERENCES & NEEDS ──────────────────────────────────────────────────
  -- Brief uses: restaurant filtering, safety/accessibility callouts, destination scoring
  dietary         text[],     -- none | vegetarian | vegan | halal | kosher | glutenfree | allergies
  mobility        text        CHECK (mobility IN ('none', 'some', 'full')),
  priorities      text[],     -- safety | lgbtq | eco | offbeaten | instagram
                              -- family | english | lowcrowds
  destination_choice text     CHECK (destination_choice IN ('open', 'region', 'specific')),
  destination_hint   text,    -- free-text region or destination if not fully open

  -- ── FINAL DETAILS (the "magic" fields) ───────────────────────────────────
  -- Brief uses: personalised itinerary copy, local tips, hidden gems
  dream_day       text,
  past_trips      text,
  avoid           text,
  other_notes     text,

  -- ── META ─────────────────────────────────────────────────────────────────
  source          text,       -- how they heard about Detour

  -- Tracks the furthest step reached — useful for funnel drop-off analysis.
  -- 1 = left after basics, 2 = left after style, 3 = left after preferences, 4 = submitted
  step_reached    integer     DEFAULT 1
);

-- Allow anyone with the anon key to INSERT (public form).
-- Restrict SELECT/UPDATE/DELETE to authenticated users (your team only).
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Grants: RLS policies alone aren't enough — the role also needs SQL-level permission.
-- SELECT is required because the step-1 INSERT returns the new row id (.select('id')).
-- UPDATE is required for steps 2, 3, and 4.
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE ON submissions TO anon;

CREATE POLICY "Public can insert"
  ON submissions FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read and update"
  ON submissions FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Handy index for your dashboard queries
CREATE INDEX submissions_status_idx  ON submissions (status);
CREATE INDEX submissions_created_idx ON submissions (created_at DESC);
