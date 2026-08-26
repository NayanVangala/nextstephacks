-- 报事:人所报路之障。匿名而不收私。
--
-- Anonymous by design: no IP, no device id, no account, no precise home
-- location. A report binds to a sidewalk EDGE, never to a person.
--
-- 未验之报不得冒为实。default 为 unverified,界面必著之 —— 与 confidence、
-- backup_power、wheelchair_boarding 同一理:不知者不得谓之知。

create type 报事之类 as enum (
  'curb_cut_broken',
  'sidewalk_blocked',
  'no_shade',
  'closed_facility',
  'other'
);

create type 报事之状 as enum ('unverified', 'confirmed', 'disputed');

create table if not exists 报事 (
  id          uuid primary key default gen_random_uuid(),
  city_id     text not null,
  edge_id     bigint not null,
  kind        报事之类 not null,
  note        text check (char_length(note) <= 500),
  status      报事之状 not null default 'unverified',
  created_at  timestamptz not null default now()
);

-- 依城与段而查,故索之。
create index if not exists 报事_城段_idx on 报事 (city_id, edge_id);
create index if not exists 报事_时_idx on 报事 (created_at desc);

alter table 报事 enable row level security;

-- anon 得读。报事本为公器,无所隐。
create policy "报事_众可读" on 报事
  for select
  to anon, authenticated
  using (true);

-- anon 得写,然不得改、不得删 —— 免一人抹众人之报。
-- 无 update/delete 之 policy,则 RLS 默拒之。此为所欲,非遗漏。
-- Report moderation (flipping status to confirmed/disputed) is intentionally
-- NOT exposed to anon; it requires the service role or a future moderator role.
create policy "报事_众可增" on 报事
  for insert
  to anon, authenticated
  with check (
    char_length(coalesce(note, '')) <= 500
    and city_id in ('la')
    and status = 'unverified'
  );
