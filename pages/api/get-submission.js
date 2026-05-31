import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing id' });

  const { data, error } = await supabase
    .from('submissions')
    .select(
      'id, first_name, email, departure_date, return_date, departure_city, ' +
      'group_type, kids_ages, trip_goals, pace, accommodation_style, budget_per_person, ' +
      'dietary, mobility, priorities, destination_choice, destination_hint, ' +
      'dream_day, past_trips, avoid, other_notes, source, step_reached, status'
    )
    .eq('id', id)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: 'Not found' });
  }

  if (['in_progress', 'completed', 'delivered'].includes(data.status)) {
    return res.status(200).json({ alreadyPaid: true });
  }

  return res.status(200).json({ submission: data });
}
