import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://guide.trydetour.com';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).end();

  const authHeader = req.headers.authorization;
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Find paid submissions where brief generation hasn't started or got stuck.
  // The 2-minute buffer avoids racing the webhook fire-and-forget.
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();

  const { data: pending, error } = await supabase
    .from('submissions')
    .select('id, first_name, email')
    .eq('status', 'in_progress')
    .eq('brief_generation_status', 'pending')
    .lt('created_at', twoMinutesAgo)
    .limit(3);

  if (error) {
    console.error('[generate-brief-cron] Fetch error:', error);
    return res.status(500).json({ error: 'DB error' });
  }

  if (!pending || pending.length === 0) {
    return res.status(200).json({ processed: 0 });
  }

  console.log(`[generate-brief-cron] Found ${pending.length} pending briefs`);

  const results = await Promise.allSettled(
    pending.map((sub) =>
      fetch(`${BASE_URL}/api/generate-trip-brief`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.CRON_SECRET}`,
        },
        body: JSON.stringify({ submissionId: sub.id }),
      })
    )
  );

  const triggered = results.filter((r) => r.status === 'fulfilled').length;
  console.log(`[generate-brief-cron] Triggered ${triggered}/${pending.length}`);

  return res.status(200).json({ processed: pending.length, triggered });
}
