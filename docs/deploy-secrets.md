# Secrets and IDs

Everything here is **optional**. The tool routes, maps, and reports with none of
it set — that is the default mode, not a degraded one. Each credential turns on
one specific thing, and each job that needs one checks first and skips cleanly
rather than failing.

Set a repository secret with:

```bash
gh secret set NAME      # prompts, input hidden
```

or **Settings → Secrets and variables → Actions → New repository secret**.

---

## Deployment

### `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`

Deploys to Cloudflare Pages.

1. `npx wrangler login`
2. `npx wrangler pages project create passable --production-branch main` — choose
   **Direct Upload**, not git-connected. The workflow uploads a prebuilt `dist`;
   a git-connected project would deploy a second time and fight it.
3. `npx wrangler whoami` → copy the **Account ID**.
4. Token: <https://dash.cloudflare.com/profile/api-tokens> → Create Custom Token
   → permission **Account · Cloudflare Pages · Edit**. Shown once.

Without them: the `cloudflare` job prints how to add them and exits 0.

### `VERCEL_TOKEN`

Deploys to Vercel and re-points `passable-la.vercel.app`.

1. <https://vercel.com/account/tokens> → Create Token, scoped to the team that
   owns the project.
2. `gh secret set VERCEL_TOKEN`

`VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` are **not** secrets — they are
identifiers, useless without the token, and live in `.github/workflows/deploy.yml`.

Without it the job skips. That is worth watching: the deployment stays live but
frozen at whatever was last pushed manually, and the job still reports success,
so nothing on screen says the site is stale. This has already happened twice.

The alias step is separate and deliberate: `vercel --prod` only re-points domains
*assigned to the project*, and `passable-la.vercel.app` is a hand-created alias
outside that set, so `--prod` leaves it on the previous deployment.

---

## Analytics

### `VITE_GA_ID`

Google Analytics measurement id, `G-XXXXXXXXXX`, from
<https://analytics.google.com> → Admin → Data Streams → your web stream.

**Unset means genuinely off**: no cookie banner renders and the script is never
requested. Set, the banner appears and the script loads *only* after a visitor
accepts. Declining or ignoring it loads nothing.

Set it in three places if you want it everywhere, because Vercel and Cloudflare
build outside GitHub Actions and cannot read repository secrets:

```bash
gh secret set VITE_GA_ID                       # GitHub Pages
npx vercel env add VITE_GA_ID production       # Vercel
npx wrangler pages secret put VITE_GA_ID       # Cloudflare
```

---

## Shared reports and sign-in

### `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

Turns on shared reports and optional sign-in. Without them the app runs in
local-only report mode: reports save to browser storage and no sign-in button
renders at all. That is a supported mode — a sign-in button with nothing behind
it is worse than none.

**Setup**, about 25 minutes, full detail in [auth-setup.md](auth-setup.md):

1. Create a project at <https://supabase.com/dashboard>.
2. Copy the **Project URL** and the **anon public** key from
   Project Settings → API. Newer projects issue a `sb_publishable_...` key
   instead; either works, the variable name is just a name.
3. Apply the migrations — there are five, and the fourth removes a permissive
   policy that defeated the strict ones, so do not skip ahead:
   ```bash
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase db push
   ```
4. Set them for each host:
   ```bash
   gh secret set VITE_SUPABASE_URL          # Pages + Cloudflare
   gh secret set VITE_SUPABASE_ANON_KEY
   npx vercel env add VITE_SUPABASE_URL production
   npx vercel env add VITE_SUPABASE_ANON_KEY production
   ```

The anon/publishable key is designed to be public — row-level security is what
protects the data — so it lives in secrets to keep it out of the source, not
because exposure would matter. Never put the `service_role` key anywhere near
this repo; that one bypasses RLS entirely.

The `build` and `cloudflare` jobs read both from repository secrets. Vercel
builds remotely and cannot see them, which is why it needs its own project
environment.

---

## What is deliberately not here

No API keys for map tiles, geocoding, weather, transit, or Census data. Every
runtime data source is keyless. That is a constraint, not an oversight: the app
has to run from a static host with no secrets and keep working when forked.
