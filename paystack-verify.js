// POST { reference }
// Verifies payment with Paystack (never trust the client), then flips the
// matching escrow_order/food_order to "paid" — money now sits with the
// platform until release (confirm-received / Swift PIN / vendor delivered).
const { paystack, supabaseAdmin, setCors } = require('./_lib');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { reference } = req.body;
    if (!reference) return res.status(400).json({ error: 'Missing reference' });

    const data = await paystack(`/transaction/verify/${encodeURIComponent(reference)}`);
    if (data.data.status !== 'success') {
      return res.status(200).json({ ok: false, status: data.data.status });
    }

    const { order_type, order_id } = data.data.metadata || {};
    const amountPaid = data.data.amount; // kobo, confirmed by Paystack
    const sb = supabaseAdmin();

    if (order_type === 'escrow') {
      const { data: order, error } = await sb.from('escrow_orders').select('*').eq('id', order_id).single();
      if (error || !order) return res.status(404).json({ error: 'Order not found' });
      if (order.status !== 'awaiting_payment') return res.status(200).json({ ok: true, already: true });
      if (amountPaid < order.amount_kobo) return res.status(400).json({ error: 'Amount mismatch' });

      await sb.from('escrow_orders').update({
        status: 'paid_escrow', paystack_reference: reference, updated_at: new Date().toISOString(),
      }).eq('id', order_id);
    } else if (order_type === 'food') {
      const { data: order, error } = await sb.from('food_orders').select('*').eq('id', order_id).single();
      if (error || !order) return res.status(404).json({ error: 'Order not found' });
      if (order.status !== 'awaiting_payment') return res.status(200).json({ ok: true, already: true });
      if (amountPaid < order.amount_kobo) return res.status(400).json({ error: 'Amount mismatch' });

      await sb.from('food_orders').update({
        status: 'paid', paystack_reference: reference, updated_at: new Date().toISOString(),
      }).eq('id', order_id);
    } else {
      return res.status(400).json({ error: 'Unknown order_type in metadata' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
