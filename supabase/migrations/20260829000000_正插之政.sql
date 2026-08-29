-- 正插之政:去其遺者。
--
-- 20260827 之 migration 意在去舊之插政而代以嚴者,然所 drop 者名「报事_众可插」,
-- 而 20260826 所建者名「报事_众可增」—— 一字之差,故舊政未去。
--
-- **postgres 之 RLS,同命之政以「或」合之。** 故舊之寬政與新之嚴政並存,
-- 而寬者勝:登入之人得以他人之 uuid 插报。
-- 20260827 之註自言「The WITH CHECK is the load-bearing part... would let anyone
-- put words in any other account's mouth」—— 而其所防者,正未防也。
--
-- The 20260827 migration meant to replace the permissive insert policy with a
-- strict one, but dropped "报事_众可插" while 20260826 had created
-- "报事_众可增" — one character apart, so the old policy survived.
--
-- POSTGRES OR-COMBINES POLICIES FOR THE SAME COMMAND. The permissive one
-- therefore won, and a signed-in user could insert a report attributed to any
-- other account's uuid. Verified against real Postgres (PGlite): Mallory
-- successfully filed a report as Alice.
--
-- 舊政又有二失:
--   一、city_id = 'la' 者,一城之時所書也。今七城,而此政但許洛城。
--   二、status = 'unverified' 者,拒 confirmed/disputed 之插,而表態賴之。
-- 二者今皆不害(以其或合),然舊政一日不去,則其嚴政可為所破。
--
-- Two further defects in the old policy: it hardcodes city_id = 'la' (written
-- when there was one city; there are now seven) and forbids inserting
-- confirmed/disputed, which the stance feature depends on. Neither bites today
-- because the policies OR — which is exactly why leaving it in place is unsafe.

drop policy if exists "报事_众可增" on 报事;

-- 其所當存者,已立於前 —— 匿名者 reporter_id 必 null,登入者必己身。
-- 此但驗其果存,不重立之。
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = '报事' and policyname = '报事_匿名可插'
  ) then
    raise exception '报事_匿名可插 不存 —— 20260827 之 migration 未行?';
  end if;
  if not exists (
    select 1 from pg_policies
    where tablename = '报事' and policyname = '报事_己身可插'
  ) then
    raise exception '报事_己身可插 不存 —— 20260827 之 migration 未行?';
  end if;
end $$;

-- 舊政所載之限,其可存者移於此 —— 註之長,不逾五百。
-- 政去而其限不當隨之而去,故以 constraint 固之,不復賴於 policy。
-- The old policy also enforced note length. That constraint is worth keeping,
-- so it moves to a CHECK where it belongs rather than vanishing with the policy.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = '报事_注不逾五百'
  ) then
    alter table 报事
      add constraint 报事_注不逾五百
      check (char_length(coalesce(note, '')) <= 500);
  end if;
end $$;
