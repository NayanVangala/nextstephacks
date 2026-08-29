# Sign-in setup (Google + GitHub)

The code is written and shipped. It stays completely invisible until you provide
a Supabase project, because a sign-in button with nothing behind it is worse than
no sign-in button. Everything below is a step **you** have to do — creating
accounts and handling client secrets is not something I can do for you.

Budget about 25 minutes.

---

## What signing in is for

Nothing is gated behind it, and nothing ever should be. Reporting a broken curb
cut stays anonymous by default and requires no account: an accessibility tool
that demands a login before you can say "this is broken" has failed the person
standing at the broken thing.

What an account buys is **attribution** — a report tied to an identity can be
confirmed by somebody else, which is the only route by which an `unverified`
report ever becomes a `confirmed` one.

---

## 1. Create the Supabase project

1. Go to https://supabase.com/dashboard, create a project.
2. Note the **Project URL** and the **anon public key** from Project Settings →
   API. Both are safe to publish — the anon key is designed to ship in a browser
   bundle, and row-level security is what actually protects the data.

Do not put the `service_role` key anywhere near this repo.

## 2. Run the migrations

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

That applies four migrations:

- `20260826000000_报事.sql` — the reports table, RLS on, anon can read and insert
- `20260827000000_报事之属人.sql` — adds `reporter_id` and the strict insert policies
- `20260828000000_报之表態.sql` — allows confirm/dispute, one stance per person per segment
- `20260829000000_正插之政.sql` — **removes a permissive policy that defeated the
  strict ones**

That last one matters. The 20260827 migration dropped a policy named
`报事_众可插` while the original had created `报事_众可增` — one character apart, so
the permissive policy survived. **Postgres OR-combines RLS policies for the same
command**, so the permissive one won and a signed-in user could file reports
attributed to any other account. Verified by executing the SQL against real
Postgres, then fixed and re-verified.

`src/frontend/tests/migrations.test.ts` runs all four migrations against an
in-process Postgres (PGlite) on every `npm test` and asserts the policy
behaviour, including that every INSERT policy constrains `reporter_id`. Reading
the SQL cannot catch a policy-name typo; running it can.

## 3. Create the OAuth apps

**GitHub** — Settings → Developer settings → OAuth Apps → New OAuth App

- Homepage URL: `https://nayanvangala.github.io/nextstephacks/`
- Authorization callback URL: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`

**Google** — Google Cloud Console → APIs & Services → Credentials → OAuth client
ID → Web application

- Authorised redirect URI: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`

The callback goes to **Supabase**, not to the GitHub Pages site. Pages is static
and cannot receive one.

## 4. Enable the providers in Supabase

Dashboard → Authentication → Providers → enable Google and GitHub, and paste each
client ID and secret **there**. The secrets live in Supabase and never enter this
repo.

Then Authentication → URL Configuration:

- Site URL: `https://nayanvangala.github.io/nextstephacks/`
- Additional redirect URLs: add `http://localhost:5173/` for local development

## 5. Give the app the two public values

Local:

```bash
cd src/frontend
printf 'VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co\nVITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY\n' > .env.local
```

Deployed: add both as repository secrets and pass them into the build step in
`.github/workflows/deploy.yml`. Vite inlines `VITE_`-prefixed variables at build
time, so they must exist when the workflow runs, not at page load.

---

## Verifying it works

With no `.env.local`, `得供給()` returns null and:

- no sign-in buttons render anywhere
- reports save to local SQLite only
- the app is exactly what it is today

With it configured:

- "Continue with Google" and "Continue with GitHub" appear in the landing nav and
  the app header
- signing in round-trips through Supabase and returns you **to the route you were
  on** — the hash carrying your city, points, profile and hour is saved before
  the redirect and restored after, because the OAuth return wipes it
- a report filed while signed in carries your `reporter_id`; one filed signed-out
  carries `null`

## What is deliberately not built

- **No UPDATE policy on reports.** If a report could be edited after being
  confirmed, its text could be swapped and the confirmation would vouch for
  something nobody read.
- **No profile, avatar, or display name is stored.** Only the auth uuid, which
  resolves solely inside `auth.users`, and anon cannot read that table. A reader
  sees "attributed" or "anonymous", never who.
- **Nothing is gated.** If you later gate a feature behind sign-in, the privacy
  copy on the report form has to change with it.
