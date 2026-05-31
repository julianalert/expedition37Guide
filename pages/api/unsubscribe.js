import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  const { sid } = req.query;

  if (sid) {
    await supabase
      .from('submissions')
      .update({ abandoned_sequence_stopped: true })
      .eq('id', sid);
  }

  res.redirect(302, '/unsubscribed');
}
