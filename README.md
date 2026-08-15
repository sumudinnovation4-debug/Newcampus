# CampusPlug

CampusPlug is a campus-first social marketplace platform built for university communities. It combines marketplace listings with escrow-protected payments, a social feed, student profiles, campus-based discovery, alerts, and engagement tracking into one modern web app.

The product is designed around one idea: students should be able to discover campus conversations, services, products, updates, and trusted people in one place.

---

## Overview

CampusPlug provides:

- Marketplace-style listing support for products and services
- In-chat haggling with escrow-protected transactions
- Swift delivery with runner pickup and PIN-gated payout
- Food ordering with quick checkout
- Wallet and P2P transfers between users
- A ranked campus feed for posts and updates
- Student profile pages with posts and plug activity
- Alerts and notifications for user activity
- Mobile-first design with desktop support
- Light and dark theme support
- Media-ready post cards for text, images, and videos
- Supabase-powered authentication, database, storage, and realtime updates
- Google-only sign-in with onboarding for new users

---

## Tech Stack

| Area | Technology |
|---|---|
| Frontend | React + Vite |
| Styling | TailwindCSS + CSS variables |
| Backend | Supabase |
| Database | PostgreSQL via Supabase |
| Auth | Supabase Auth |
| Realtime | Supabase Realtime |
| Media Uploads | Supabase Storage / Cloudinary-ready flow |
| Build Tool | Vite |
| Payments | Paystack (Popup + Transfers API) |
| Serverless API | Vercel Functions |

---

## Core Features

### Marketplace & Payments

Marketplace is CampusPlug's core product — students list, haggle, and transact on products and services, with all money movement handled through Paystack and verified server-side via Vercel serverless functions. The frontend only ever uses the Paystack publishable key.

- **Normal item (haggled in chat):** seller starts a transaction in the chat thread and confirms pickup location; buyer pays into escrow and confirms dropoff location. Funds are held until the buyer confirms receipt, then released to the seller (95%) via Paystack Transfer — or refunded if either side cancels.
- **Swift delivery:** after a runner accepts a delivery request, the buyer pays to confirm before pickup can start. Entering the correct delivery PIN on handoff auto-releases payout to the runner (95%) with no extra steps.
- **Food orders:** food-category listings get their own quick checkout in the cart — no chat required. Buyers confirm receipt or cancel & refund from the orders page.
- **Wallet / P2P:** send money to another user by username (free, wallet-to-wallet) or withdraw to a bank account (5% commission taken at withdrawal). Includes bank account setup and transaction history.
- **Commission:** a flat 5% is taken automatically on escrow releases, Swift payouts, and wallet withdrawals, computed in `computeCommission()` in `api/_lib.js`.
- **Auth:** sign-in is Google-only; new users complete a short onboarding step to add their name and school.

Payment verification currently happens on the client's redirect back from Paystack. A webhook endpoint for extra reliability (e.g. if a buyer closes the tab mid-payment) is a planned addition, along with a vendor-side dashboard so vendors can update food order status themselves.

### Yard Feed

The Yard feed is the main campus timeline. It supports:

- Ranked post loading through the feed algorithm RPC
- Safe fallback to latest posts when the ranked feed is unavailable
- Realtime post updates
- Text, image, and video posts
- Text-only post background styling
- Media-aware layouts so image/video posts do not receive text backgrounds
- Screen-safe post action menu
- Mobile and desktop responsive layouts

### Feed Ranking Algorithm

The feed algorithm scores posts using a combination of:

- Freshness
- Author affinity
- Variety boost
- Unseen post boost
- Low-engagement rescue
- Hub post boost
- Random jitter for natural feed movement

This helps the feed feel active while still giving new creators and lower-engagement posts a chance to be seen.

### Post Cards

Post cards include:

- Profile identity display
- Post content rendering
- Image and video support
- Purple primary-color active states
- Comment, repost, archive, and plug actions
- Responsive media preview
- Dark and light mode support

### Profile Pages

The profile experience supports:

- User identity and profile information
- User posts
- Plug/listing activity
- Empty states
- Responsive layout across mobile and desktop

### My Plug

The My Plug page supports listing discovery and user-owned plug activity. It is designed to work with product and service-style listings.

### Alerts

The Alerts page provides a cleaner notification experience with:

- Read/unread visual states
- Better spacing and card styling
- Theme-aware surfaces
- Professional empty states

### Theme System

CampusPlug includes a shared theme system for light and dark mode using global CSS variables. This prevents white text on white surfaces and keeps UI surfaces consistent across pages.

---

## Project Structure

```txt
src/
  components/
    AppLayout.jsx
    CreatePostModal.jsx
    PostCard.jsx
  lib/
    contentLoaders.js
    feed.js
    supabase.js
  pages/
    AlertsPage.jsx
    MyPlugPage.jsx
    ProfilePage.jsx
    YardPage.jsx
  index.css
assets/
  js/
    payments.js
api/
  _lib.js
  ...
sql/
  feed_algorithm.sql
  payments_schema.sql
cart.html
swift.html
chat-thread.html
wallet.html
orders.html
auth.html
onboarding.html
```

---

## Environment Variables

Create a `.env` file in the project root.

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

VITE_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_unsigned_upload_preset
```

Set the following in your Vercel project's Environment Variables (server-side only, never in the frontend `.env`):

```env
PAYSTACK_SECRET_KEY=your_paystack_secret_key
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

`SUPABASE_SERVICE_ROLE_KEY` comes from Supabase → Project Settings → API — this is not the anon key. Never commit a real `.env` file, even to a private repo.

Do not expose private API secrets in the frontend.

---

## Cloudinary Setup

To get Cloudinary credentials:

1. Create or open your Cloudinary account.
2. Go to the Cloudinary Console dashboard.
3. Copy your **Cloud Name**.
4. Go to **Settings → Upload → Upload Presets**.
5. Create an **unsigned upload preset**.
6. Restrict the preset by file type, upload folder, and size limit.
7. Copy the preset name into `VITE_CLOUDINARY_UPLOAD_PRESET`.

Only the cloud name and unsigned preset should be used in frontend code. API secrets should stay server-side only.

---

## Getting Started

Install dependencies:

```bash
npm install
```

Start development server:

```bash
npm run dev
```

Create production build:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

---

## Supabase Setup

The app expects the main Supabase tables for:

- users
- profiles
- posts
- post likes
- post comments
- listings
- notifications
- universities
- feed impressions
- feed engagements
- wallets
- escrow_orders
- food_orders
- p2p_transfers
- payout_recipients
- wallet_transactions
- receipts

The ranked feed uses RPC functions from `sql/feed_algorithm.sql`. Payments tables are created by running `sql/payments_schema.sql` once in the Supabase SQL editor.

If the feed RPC is unavailable, the app safely falls back to loading recent posts directly from the `posts` table.

---

## Recent Improvements

This update includes:

- Fixed Yard post loading
- Fixed Profile post loading
- Fixed My Plug loading
- Added safer content loading utilities
- Improved light and dark theme consistency
- Fixed white text on white background issues
- Improved post card styling
- Fixed the post composer UI
- Improved Alerts page styling
- Added safer action menu behavior
- Improved image preview behavior
- Removed unwanted Bump, Holla, and Seen actions
- Kept Plug active color aligned with the primary purple brand color

---

## Testing Checklist

Before merging to `main`, test the following:

- User can sign in
- Yard feed loads posts
- New posts appear correctly
- Profile page loads user posts
- My Plug loads listings
- Alerts page renders correctly
- Light mode has correct contrast
- Dark mode has correct contrast
- Post composer opens and submits properly
- Three-dot menu opens within the screen
- Image preview fits the screen
- Plug active state uses purple
- Mobile layout works correctly
- Desktop layout looks polished

---

## Git Workflow

Recommended flow:

```bash
git status
git add .
git commit -m "Improve feed loading, theme system, and post UI"
git push origin your-branch-name
```

Then open a pull request into `main`.

---

## Pull Request Summary

```txt
Improved CampusPlug feed stability, post loading, and theme consistency across Yard, Profile, My Plug, and Alerts.

Highlights:
- Fixed post loading across Yard, Profile, and My Plug
- Added safer content loading to avoid broken nested Supabase joins
- Improved light/dark mode styling across key pages
- Fixed post composer UI issues
- Improved post card action menu and media preview behavior
- Removed unwanted Bump, Holla, and Seen actions
- Kept Plug action aligned with primary brand color
- Preserved existing working feed algorithm and SQL setup
```

---

## Status

CampusPlug is a polished campus social commerce experience with a stable feed, improved profile experience, responsive design, and a stronger professional UI foundation.

Escrow payments, Swift delivery payouts, food ordering, wallet/P2P transfers, and Google-only sign-in are complete and live. Still open: Paystack webhook verification (as a safety net alongside client-redirect verification) and a vendor-side dashboard for updating food order status.
