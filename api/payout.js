/**
 * POST /api/payout
 * body: { recipientCode, amount, reason, reference? }
 *
 * The real money-out call - escrow release, Swift runner payout, and
 * P2P withdrawals should all end up here. Requires the recipient to
 * already have a recipient_code from /api/create-recipient.
 *
 * NOTE: this is genuinely irreversible once it succeeds. In production
 * add auth (only your app's server/session should be able to call this,
 * never directly from an untrusted client) and idempotency (don't let
 * the same orderId trigger two payouts).
 */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { recipientCode, amount, reason, reference } = req.body || {};
  if (!recipientCode || !amount) {
    return res.status(400).json({ error: "Missing recipientCode or amount" });
  }

  try {
    const response = await fetch("https://api.paystack.co/transfer", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source: "balance",
        amount: Math.round(amount * 100), // kobo
        recipient: recipientCode,
        reason: reason || "Newcampus payout",
        reference: reference || undefined,
      }),
    });
    const data = await response.json();

    if (!data.status) {
      return res.status(400).json({ error: data.message || "Transfer failed" });
    }

    return res.status(200).json({
      success: true,
      transferCode: data.data.transfer_code,
      status: data.data.status, // "success", "pending", or "otp" (if OTP is enabled on your Paystack account)
      amount,
    });
  } catch (err) {
    return res.status(500).json({ error: "Request failed", details: err.message });
  }
}
