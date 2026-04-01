# Supabase Setup — Community Event Submissions

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free project
2. Note your **Project URL** and **anon public key** from Settings > API

## 2. Run the Migration

1. In your Supabase dashboard, go to **SQL Editor**
2. Paste the contents of `supabase/migrations/001_submissions.sql`
3. Click **Run**

This creates the `submissions` table with Row Level Security policies:
- **Public (anon)**: Can insert new submissions (status must be `pending`) and read approved events
- **Authenticated**: Can read all submissions and update status (approve/reject)

## 3. Create a Moderator Account

1. Go to **Authentication > Users** in the Supabase dashboard
2. Click **Add user > Create new user**
3. Enter the moderator's email and a password
4. This account is used to sign into `admin.html`

## 4. Update the Config

Replace the placeholder values in **two files**:

**`public/index.html`** (near line 460):
```js
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'eyJ...your-anon-key';
```

**`public/admin.html`** (near line 163):
```js
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'eyJ...your-anon-key';
```

The anon key is safe to expose publicly — RLS policies protect the data.

## 5. Test It

1. Run `npm run serve` to start the local server
2. Open `http://localhost:3000` and click **Submit an Event** — fill out the form
3. Open `http://localhost:3000/admin.html` — sign in with your moderator account
4. You should see the submission in the **Pending** tab
5. Approve it, then refresh the main dashboard — the event should appear with source "Community Submitted"

## How It Works

```
Public user submits event via modal form
  → Supabase inserts row with status: 'pending'
  → Moderator signs into admin.html
  → Reviews submission → Approves or Rejects
  → Approved events appear on the dashboard immediately
     (fetched client-side alongside events.json)
```

No changes needed to the scraper pipeline or GitHub Actions workflow.
