-- 报事之属人:登入者之报可归其人,匿名之报仍匿名。
--
-- Attribution is OPTIONAL and additive. The anonymous path is unchanged: a
-- report with reporter_id null is exactly the report this table already
-- accepted, and anon may still insert one. What signing in buys is that a
-- report can be attributed, which is the only mechanism by which an unverified
-- report can ever be confirmed by someone other than its author.
--
-- 不收其名、其邮、其像 —— 但存 auth 之 uuid。此 uuid 不出 auth.users,
-- 而 auth.users 非 anon 所能读,故一报之人,外不可知。
-- We store the auth uuid and nothing else. No name, no email, no avatar. The
-- uuid resolves only inside auth.users, which anon cannot read, so a reader
-- sees "attributed" versus "anonymous" and never who.

alter table 报事
  add column if not exists reporter_id uuid references auth.users (id) on delete set null;

comment on column 报事.reporter_id is
  '登入者之 uuid。null 者匿名之报,非缺漏。Null means anonymous, not missing.';

create index if not exists 报事_人_idx on 报事 (reporter_id) where reporter_id is not null;

-- 插之政:匿名者其 reporter_id 必为 null;登入者必为己身。
--
-- The WITH CHECK is the load-bearing part. Without it a signed-in user could
-- insert a report attributed to somebody else's uuid, which would let anyone
-- put words in any other account's mouth.
drop policy if exists "报事_众可插" on 报事;

create policy "报事_匿名可插" on 报事
  for insert
  to anon
  with check (reporter_id is null);

create policy "报事_己身可插" on 报事
  for insert
  to authenticated
  with check (reporter_id is null or reporter_id = auth.uid());

-- 己之报可自删。他人之报不可。
-- 不与 update —— 报既出而可改,则「已验」之报可易其文,其验遂无凭。
-- No UPDATE policy on purpose: if a report could be edited after the fact, a
-- confirmed report could have its text swapped and the confirmation would
-- vouch for something nobody read.
create policy "报事_己身可删" on 报事
  for delete
  to authenticated
  using (reporter_id = auth.uid());
