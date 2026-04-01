-- Erie Events Dashboard — Phase 3: Community Event Submissions
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- 1. Submissions table
create table public.submissions (
  id uuid default gen_random_uuid() primary key,
  name text not null check (char_length(name) > 2),
  date date not null,
  time text default 'TBD',
  venue text not null check (char_length(venue) > 1),
  category text not null check (category in ('Music','Sports','Festival','Comedy','Theater','Arts','Community','Family')),
  description text default '',
  organizer text not null,
  email text not null,
  url text default '',
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  submitted_at timestamptz default now(),
  reviewed_at timestamptz,
  reviewer_note text default ''
);

-- 2. Index for fast moderation queries
create index idx_submissions_status on public.submissions (status, submitted_at desc);

-- 3. Row Level Security
alter table public.submissions enable row level security;

-- Anyone can submit an event (anon insert)
create policy "Public can submit events"
  on public.submissions for insert
  to anon
  with check (status = 'pending');

-- Anyone can read approved events (for the public dashboard)
create policy "Public can read approved events"
  on public.submissions for select
  to anon
  using (status = 'approved');

-- Authenticated users (moderators) can read all submissions
create policy "Moderators can read all submissions"
  on public.submissions for select
  to authenticated
  using (true);

-- Authenticated users (moderators) can update status
create policy "Moderators can update submissions"
  on public.submissions for update
  to authenticated
  using (true)
  with check (true);
