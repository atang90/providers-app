-- Run this in the Supabase SQL Editor for your project
-- (Dashboard -> SQL Editor -> New query -> paste -> Run)
-- Adds manual drag-to-reorder support to Contacts, Tracked Items, and Notes.

alter table public.providers add column if not exists sort_order integer not null default 0;
alter table public.tracked_items add column if not exists sort_order integer not null default 0;
alter table public.notes add column if not exists sort_order integer not null default 0;

-- Backfill existing rows so they start in their current (created_at) order.
with ranked as (
  select id, row_number() over (partition by user_id order by created_at) - 1 as rn
  from public.providers
)
update public.providers p set sort_order = ranked.rn
from ranked where ranked.id = p.id;

with ranked as (
  select id, row_number() over (partition by user_id order by created_at) - 1 as rn
  from public.tracked_items
)
update public.tracked_items t set sort_order = ranked.rn
from ranked where ranked.id = t.id;

with ranked as (
  select id, row_number() over (partition by user_id order by created_at desc) - 1 as rn
  from public.notes
)
update public.notes n set sort_order = ranked.rn
from ranked where ranked.id = n.id;
