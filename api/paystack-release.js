// POST { order_type: 'escrow' | 'food', order_id }
// This is THE function that moves real money out to a seller/runner/vendor.
// It is called from three places in the frontend:
//   1. Buyer taps "Confirm received" on a normal item escrow.
//   2. A Swift runner enters the buyer's delivery PIN (auto-release, no buyer tap needed).
//   3. A food vendor marks an order "delivered" (or buyer confirms, your choice in the UI).
// It always: verifies the order is actually paid, computes 5% commission,
// transfers the remainder to the recipient's bank via Paystack, and writes a receipt.
const { paystack, supabaseAdmin, computeCommission, setCors } = require('./_lib');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { order_type, order_id } = req.body;
    if (!order_type || !order_id) return res.status(400).json({ error: 'Missing fields' });
    const sb = supabaseAdmin();
    const table = order_type === 'escrow' ? 'escrow_orders' : 'food_orders';
    const paidStatus = order_type === 'escrow' ? 'paid_escrow' : 'paid';

    const { data: order, error } = await sb.from(table).select('*').eq('id', order_id).single();
    if (error || !order) return res.status(404).json({ error: 'Order not found' });
    if (order.status === 'released') return res.status(200).json({ ok: true, already: true });
    if (order.status !== paidStatus) {
      return res.status(400).json({ error: `Order is "${order.status}", not ready for release` });
    }

    const { data: recipientRow, error: rErr } = await sb
      .from('payout_recipients').select('*').eq('user_id', order.seller_id).single();
    if (rErr || !recipientRow) {
      return res.status(400).json({ error: 'Seller/runner has not added a payout bank account yet' });
    }

    const { commission, payout } = computeCommission(order.amount_kobo);

    const transfer = await paystack('/transfer', {
      method: 'POST',
      body: JSON.stringify({
        source: 'balance',
        amount: payout,
        recipient: recipientRow.paystack_recipient_code,
        reason: order_type === 'escrow' ? 'Camplugie escrow release' : 'Camplugie food order payout',
      }),
    });

    await sb.from(table).update({
      status: 'released',
      paystack_transfer_code: transfer.data.transfer_code,
      updated_at: new Date().toISOString(),
    }).eq('id', order_id);

    await sb.from('wallet_transactions').insert({
      user_id: order.seller_id, type: 'escrow_release', amount_kobo: payout,
      related_order_id: order_type === 'escrow' ? order_id : null,
      related_food_order_id: order_type === 'food' ? order_id : null,
      note: `Payout minus 5% commission (₦${(commission / 100).toFixed(2)})`,
    });

    await sb.from('receipts').insert({
      escrow_order_id: order_type === 'escrow' ? order_id : null,
      food_order_id: order_type === 'food' ? order_id : null,
      buyer_id: order.buyer_id, seller_id: order.seller_id,
      amount_kobo: order.amount_kobo, commission_kobo: commission,
    });

    return res.status(200).json({ ok: true, payout_kobo: payout, commission_kobo: commission });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
