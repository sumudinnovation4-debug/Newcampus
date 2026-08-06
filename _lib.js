// Shared helpers for all /api/paystack-* and /api/wallet-* functions.
// These run server-side on Vercel only — never imported by frontend code.

const { createClient } = require('@supabase/supabase-js');

const PAYSTACK_BASE = 'https://api.paystack.co';
const COMMISSION_RATE = 0.05; // 5% platform commission

function supabaseAdmin() {
  // Service-role key bypasses RLS — this is the ONLY place it should be used.
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

async function paystack(path, options = {}) {
  const res = await fetch(`${PAYSTACK_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok || data.status === false) {
    throw new Error(data.message || `Paystack error on ${path}`);
  }
  return data;
}

function computeCommission(amountKobo) {
  const commission = Math.round(amountKobo * COMMISSION_RATE);
  return { commission, payout: amountKobo - commission };
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = { supabaseAdmin, paystack, computeCommission, setCors, COMMISSION_RATE };
