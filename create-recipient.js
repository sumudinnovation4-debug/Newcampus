/**
 * POST /api/create-recipient
 * body: { name, account_number, bank_code }
 *
 * Registers a user's real bank account with Paystack and returns a
 * recipient_code. That code is what /api/payout uses to actually send
 * them money later - get it once when a seller/runner/vendor sets up
 * payout details, store it against their profile, reuse it every time.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { name, account_number, bank_code } = req.body || {};
  if (!name || !account_number || !bank_code) {
    return res.status(400).json({ error: "Missing name, account_number, or bank_code" });
  }

  try {
    const response = await fetch("https://api.paystack.co/transferrecipient", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "nuban",
        name,
        account_number,
        bank_code,
        currency: "NGN",
      }),
    });
    const data = await response.json();

    if (!data.status) {
      return res.status(400).json({ error: data.message || "Could not create recipient" });
    }

    return res.status(200).json({
      recipientCode: data.data.recipient_code,
      accountName: data.data.details?.account_name,
      bankName: data.data.details?.bank_name,
    });
  } catch (err) {
    return res.status(500).json({ error: "Request failed", details: err.message });
  }
}
