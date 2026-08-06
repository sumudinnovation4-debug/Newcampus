# Camplugie payments — setup guide

## What's in this drop
- `sql/payments_schema.sql` — run this once in Supabase's SQL editor. Adds wallets, escrow_orders, food_orders, p2p_transfers, payout_recipients, wallet_transactions, receipts.
- `api/*.js` — Vercel serverless functions. These are the only place the Paystack **secret** key is ever used.
- `assets/js/payments.js` — frontend helper, included on every page that touches money. Only uses the **publishable** key.
- Edited pages: `cart.html`, `swift.html`, `chat-thread.html`. New page: `wallet.html`.

## 1. Regenerate your Paystack secret key
The `sk_test_...` key you pasted in chat should be treated as exposed — regenerate it from your Paystack dashboard (Settings → API Keys & Webhooks) and use the new one below. This costs nothing since it's a test key, just good hygiene.

## 2. Set environment variables in Vercel
Project → Settings → Environment Variables:
- `PAYSTACK_SECRET_KEY` — your new secret key
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` — from Supabase → Project Settings → API (**not** the anon key)

`.env.example` shows the shape. Never commit a real `.env` file, even to a private repo.

## 3. Run the SQL schema
Paste `sql/payments_schema.sql` into the Supabase SQL editor and run it.

## 4. Install and deploy
```
npm install
vercel deploy
```
Vercel auto-detects everything in `/api` as serverless functions — no extra config needed.

## 5. How the flows work

**Normal item (haggled in chat):** seller taps "Start transaction" in `chat-thread.html` → confirms their pickup location → item is marked sold and an `escrow_orders` row is created. Buyer taps "Pay to escrow" → confirms their dropoff location → pays via Paystack Popup → money verified server-side and held. Buyer taps "Confirm received" (or either side can "Cancel & refund") → real Paystack Transfer sends 95% to the seller's bank, or a real refund goes back to the buyer.

**Swift delivery:** buyer posts a request (existing flow, unchanged) → a runner accepts → buyer is now shown a "Pay to confirm" screen in `swift.html` before pickup can start → runner picks up (existing PIN flow) → the moment the runner enters the correct **delivery PIN**, payout auto-releases to the runner (95%) with zero extra taps.

**Food (quick order, no chat):** in `cart.html`, food-category items get their own checkout block — buyer adds a delivery note, we grab their location, and pay immediately. One `food_orders` row (and one Paystack charge) per vendor. Release currently happens the same way as escrow (call `releaseFoodOrder` when you're ready — e.g. wire it to a vendor "mark delivered" button, the same pattern used for the Swift delivery PIN).

**Wallet / P2P:** `wallet.html` — send money to another user by username (goes straight wallet-to-wallet, no fee), or withdraw to your bank (5% commission taken **at withdrawal**, not at send time), plus bank account setup and transaction history.

**Commission:** 5% everywhere, taken automatically before the Paystack Transfer goes out — the number lives in `computeCommission()` in `api/_lib.js` if you ever need to change it.

## 6. What's now finished from the earlier gap list
- **Google-only signup**: `auth.html` now shows only "Continue with Google" — the phone/email/password forms are still in the DOM (hidden) so nothing else on the page breaks, but they're unreachable from the UI. Google sign-in works for both new and returning users; new users land on `onboarding.html` to add their name/school.
- **Food order release**: new `orders.html` page lists a buyer's food orders with "Confirm received" (releases payout to the vendor) and "Cancel & refund". `cart.html` now sends buyers there right after paying.
- **Swift pickup gating**: a runner now sees "Waiting on buyer" instead of the pickup-PIN field until `escrow_orders.status = 'paid_escrow'` — no more handing over an item before it's paid for.

## 7. Still open
- **Webhooks**: verification currently happens on the client's redirect back from Paystack. For extra reliability (e.g. the buyer closes the tab mid-payment), consider adding a Paystack webhook endpoint that calls the same verify logic — I can add `api/paystack-webhook.js` if you want that safety net.
- **Vendor-side food dashboard**: right now only the buyer can confirm/cancel a food order from `orders.html`. If vendors need to mark orders "preparing"/"out for delivery" themselves, that's a small addition to `orders.html` (or a new vendor view) filtering by `seller_id` instead of `buyer_id`.

