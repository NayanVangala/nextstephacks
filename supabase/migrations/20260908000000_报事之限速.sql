-- 报事之限速。
--
-- 前此之防皆在其页:蜜之器与其时。然此非一 HTML POST,乃 React 之状,
-- 而其後之 API 众所可叩 —— 一 script 不载此页而直插万报,前防皆不及。
-- 故其限当在此,不在彼。
--
-- The client-side honeypot and time trap in ReportForm.tsx stop nothing that
-- matters: the Supabase REST endpoint accepts inserts from any script that
-- never loads the page. This is where a limit can actually hold.
--
-- ── 不可新立一政 ─────────────────────────────────────────────────────
--
-- **POSTGRES OR-COMBINES RLS POLICIES FOR THE SAME COMMAND.** Adding a new,
-- stricter insert policy alongside the existing ones would make inserts MORE
-- permissive, not less: a row rejected by the new policy would still be
-- accepted by "报事_匿名可插". This repository has already shipped that exact
-- bug once — see 20260829000000_正插之政.sql and tests/migrations.test.ts.
--
-- 故必去其旧政而重立之,以其限并入其 with check。新增一政者,适得其反。
-- The existing policies MUST therefore be dropped and recreated with the limit
-- folded into their WITH CHECK. There is no additive way to do this.
--
-- ── 所限者何 ────────────────────────────────────────────────────────
--
-- 匿名之报无人可系 —— 不收其 ip,不收其器之识,此本设计所诺,不当为限速而弃之。
-- 故匿名者但可限其段:一段一时之内,不过五报。
-- Anonymous reports carry nothing to attribute them to — no IP, no device id —
-- and that promise is not being traded away for rate limiting. So the anonymous
-- bound is per-SEGMENT: at most 5 reports on one edge per hour.
--
-- 登入者则并限其人:一人一时之内,不过二十报。
--
-- 其所不能者,亦当明言:一机遍插于诸段者,此限不及也。所能者,止于令一段
-- 不可为一人所没 —— 而一段之权本已以调和抑之(见 报之重),故其害有二重之限。
-- STATED LIMITATION: a bot spreading across many edges is not stopped by this.
-- What it does stop is any single segment being buried, which is the case that
-- actually moves routing — and 报之重's harmonic damping already blunts that
-- independently, so the two bounds compose.

-- 计其段之近报。SECURITY DEFINER 者,免其自 RLS 而递归。
-- SECURITY DEFINER avoids recursing through 报事's own RLS while the policy
-- that calls it is itself being evaluated. search_path is pinned because a
-- SECURITY DEFINER function with a mutable search_path is a privilege
-- escalation path.
create or replace function 报事_段之近数(_city_id text, _edge_id bigint)
returns bigint
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select count(*)
  from 报事
  where city_id = _city_id
    and edge_id = _edge_id
    and created_at > now() - interval '1 hour'
$$;

revoke all on function 报事_段之近数(text, bigint) from public;
grant execute on function 报事_段之近数(text, bigint) to anon, authenticated;

create or replace function 报事_人之近数(_reporter uuid)
returns bigint
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select count(*)
  from 报事
  where reporter_id = _reporter
    and created_at > now() - interval '1 hour'
$$;

revoke all on function 报事_人之近数(uuid) from public;
grant execute on function 报事_人之近数(uuid) to anon, authenticated;

-- 去其旧而重立之。其原限一字不改 —— 但增其速之限。
-- The original conditions are preserved verbatim; only the rate bound is added.
drop policy if exists "报事_匿名可插" on 报事;
drop policy if exists "报事_己身可插" on 报事;

create policy "报事_匿名可插" on 报事
  for insert
  to anon
  with check (
    reporter_id is null
    and 报事_段之近数(city_id, edge_id) < 5
  );

create policy "报事_己身可插" on 报事
  for insert
  to authenticated
  with check (
    (reporter_id is null or reporter_id = auth.uid())
    and 报事_段之近数(city_id, edge_id) < 5
    and (reporter_id is null or 报事_人之近数(reporter_id) < 20)
  );

-- 索引:此二函每插必呼之,故其查当疾。城段之索已有(20260826),
-- 而其中无时,故补一并时之索;人之索亦然。
-- Both functions run on every insert, so they need indexes that cover the
-- time predicate rather than filtering a full segment history in memory.
create index if not exists 报事_城段时_idx
  on 报事 (city_id, edge_id, created_at desc);

create index if not exists 报事_人时_idx
  on 报事 (reporter_id, created_at desc)
  where reporter_id is not null;
