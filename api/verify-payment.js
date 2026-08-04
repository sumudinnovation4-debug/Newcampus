/**
 * POST /api/verify-payment
 * body: { reference: string }
 *
 * Confirms a payment actually succeeded on Paystack's side, using the
 * secret key. Call this before trusting any "payment successful"
 * callback from the browser - the client-side callback alone can be
 * faked in devtools.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { reference } = req.body || {};
  if (!reference) return res.status(400).json({ error: "Missing reference" });

  try {
    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
    });
    const data = await response.json();

    if (!data.status) {
      return res.status(400).json({ verified: false, message: data.message || "Verification failed" });
    }

    const tx = data.data;
    return res.status(200).json({
      verified: tx.status === "success",
      status: tx.status,
      amount: tx.amount / 100, // back to naira
      currency: tx.currency,
      reference: tx.reference,
      paidAt: tx.paid_at,
      customerEmail: tx.customer?.email,
    });
  } catch (err) {
    return res.status(500).json({ error: "Verification request failed", details: err.message });
  }
}
