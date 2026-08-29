-- 表態:確認或存疑他人之报。
--
-- Until now the client stripped `status` on insert and RLS defaulted every row
-- to 'unverified', which meant nothing could ever LEAVE unverified. The report
-- system could collect local knowledge but never corroborate it, so a curb cut
-- five people had confirmed looked exactly like one nobody had checked.
--
-- 表態者,新一行也,非改舊行。旧行不可改 —— 报既验而其文可易,则验无所凭。
-- A confirmation is a NEW row, never an edit. There is deliberately no UPDATE
-- policy: if a confirmed report could have its text swapped afterwards, the
-- confirmation would vouch for something nobody read.

drop policy if exists "报事_匿名可插" on 报事;
drop policy if exists "报事_己身可插" on 报事;

-- 匿名者得报,亦得表態。其 reporter_id 必为 null。
create policy "报事_匿名可插" on 报事
  for insert
  to anon
  with check (reporter_id is null);

-- 登入者同,而其 reporter_id 必为己身。
--
-- 三状皆许 —— 前但许其默认。然其重不由此定:客户端以调和之法递减,
-- 故一人屡报,其效远不及数人各报一次。
-- All three statuses are allowed. Weight is NOT determined here: the client
-- damps repeated reports harmonically, so one person filing ten times is worth
-- far less than ten people filing once. Gating status in SQL would not stop a
-- determined reporter anyway; damping the weight does.
create policy "报事_己身可插" on 报事
  for insert
  to authenticated
  with check (reporter_id is null or reporter_id = auth.uid());

-- 一人於一段,一态一次。屡表其态者,徒增其数而已 —— 于此绝之。
-- One stance per person per segment. Without this a single account could file
-- the same confirmation a hundred times; the harmonic damping would blunt it,
-- but not to zero.
create unique index if not exists 报事_一人一段一态_idx
  on 报事 (reporter_id, edge_id, status)
  where reporter_id is not null and status in ('confirmed', 'disputed');
