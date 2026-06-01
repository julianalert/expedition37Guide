import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://guide.trydetour.com';

export default async function handler(req, res) {
  const { sid, secret } = req.query;

  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!sid) return res.status(400).json({ error: 'sid required' });

  // Reset status so generate-trip-brief will process it
  const { error } = await supabase
    .from('submissions')
    .update({ brief_generation_status: 'pending' })
    .eq('id', sid);

  if (error) {
    console.error('[retry-brief] Update error:', error);
    return res.status(500).json({ error: 'DB update failed' });
  }

  // Trigger generation (fire-and-forget — redirect user to confirmation)
  fetch(`${BASE_URL}/api/generate-trip-brief`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.CRON_SECRET}`,
    },
    body: JSON.stringify({ submissionId: sid }),
  }).catch(console.error);

  return res.status(200).json({
    ok: true,
    message: `Retry triggered for ${sid}. Brief page: ${BASE_URL}/brief/${sid}`,
  });
}
