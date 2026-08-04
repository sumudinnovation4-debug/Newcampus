/**
 * GET /api/list-banks
 * Returns the list of banks Paystack supports, each with the bank_code
 * needed to create a transfer recipient. Use this to populate a bank
 * dropdown when a seller/runner/vendor adds their payout account.
 */
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const response = await fetch("https://api.paystack.co/bank?country=nigeria", {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
    });
    const data = await response.json();
    if (!data.status) return res.status(400).json({ error: data.message || "Could not fetch banks" });

    const banks = data.data.map((b) => ({ name: b.name, code: b.code }));
    return res.status(200).json({ banks });
  } catch (err) {
    return res.status(500).json({ error: "Request failed", details: err.message });
  }
}
