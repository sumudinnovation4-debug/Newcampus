# Camplugie

Camplugie (Campus Plug) is a university-focused social and marketplace platform built for Nigerian university students — buy, sell, haggle, and get things delivered on campus, all in one app.

**Live site:** [www.camplugie.com](https://www.camplugie.com)

## What Camplugie does

- **Marketplace with in-chat haggling** — list an item, negotiate price directly in chat, and start a transaction when you've agreed on terms.
- **Escrow payments** — once a deal is struck, the buyer pays into escrow. Funds are held until the buyer confirms they've received the item, then released to the seller (or refunded if the deal falls through).
- **Swift delivery** — post a delivery request, a runner accepts it, and payment is confirmed before pickup. A delivery PIN gates handoff and auto-releases payout to the runner the moment it's entered.
- **Food ordering** — quick checkout for food-category listings, no chat required. Pay immediately, then confirm receipt (or cancel & refund) from your orders page.
- **Wallet & P2P transfers** — send money to other users by username for free, or withdraw to your bank account. Full transaction history included.
- **Google sign-in** — fast, single-tap signup and login. New users complete a short onboarding step to add their name and school.

## How payments work

All money movement runs through Paystack, with a 5% commission taken automatically on:
- Escrow releases (seller receives 95%)
- Swift delivery payouts (runner receives 95%)
- Wallet withdrawals to bank (taken at withdrawal, not at send)

Wallet-to-wallet transfers between users are free.

Payment verification, transfers, and refunds all happen server-side via Vercel serverless functions — the app's frontend never touches a secret key.

## Tech stack

- **Frontend:** React (Vite), mobile-first
- **Backend:** Supabase (Postgres, auth, storage)
- **Payments:** Paystack (Popup for checkout, Transfers API for payouts)
- **Hosting:** Vercel (static frontend + serverless API routes)

## Status

The core marketplace, escrow, Swift delivery, food ordering, wallet/P2P, and Google-only auth flows are complete and live. Two things still open on the roadmap:

- **Webhook verification** — payment confirmation currently relies on the client redirect from Paystack; a webhook endpoint would add a safety net for interrupted sessions.
- **Vendor-side food dashboard** — vendors can't yet update order status ("preparing," "out for delivery") themselves; only buyers can confirm or cancel from their end.
- 
