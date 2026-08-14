// POST { phone }
// Given a phone number, returns the account email it's linked to (if any) —
// so the client can then call supabase.auth.signInWithPassword({email, password}).
// Runs server-side with the service role key on purpose: letting the public
// anon key query profiles by phone would let anyone enumerate phone numbers
// and discover which real email address (often a real Gmail) each one maps
// to. This endpoint only ever returns a yes/no + the email for an exact,
// single phone match — nothing else about the account.
const { supabaseAdmin, setCors } = require('./_lib');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Missing phone' });

    const sb = supabaseAdmin();
    const { data, error } = await sb.from('profiles').select('email, has_password').eq('phone_number', phone).maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    if (!data || !data.email) return res.status(404).json({ error: 'No account found for that phone number' });
    if (!data.has_password) return res.status(400).json({ error: 'This phone is linked to an account, but no password has been set for it yet — finish setting one up in Complete your profile.' });

    return res.status(200).json({ email: data.email });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
