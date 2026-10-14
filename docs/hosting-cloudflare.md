# Hosting on Cloudflare: setup plan

- Status: plan only. No step is complete.
- Date of the checks: 2026-10-14.
- Tool: the Cloudflare CLI, `cf` (beta, package `cf@1.0.0-beta.17`).
- Decision (2026-10-14): the host changes at the launch of the portfolio redo, not before.

## 1. Summary

At this time, Vercel serves the site.
Simply.com is the DNS provider, and Key-Systems is the registrar.

After the move, one Cloudflare Worker with the name `portfolio` serves the site.
The Worker serves the static export of the Next.js site from Workers static assets.
In Phase 6, the Worker gets a Durable Object for the live room and a D1 database for the guestbook.

The host changes on the day that the redo goes live.
Until that day, Vercel serves the current portfolio from `main`.
During the redo, the redo runs on Cloudflare previews only.

You do all Cloudflare work with `cf`.
At this time, `cf` cannot stream live logs or set one secret.
For these two tasks, use `npx wrangler`.

The Workers Free plan is sufficient for this site.
Requests to static assets are free, and they have no limit.

## 2. Facts from the checks

| Item | Value |
| --- | --- |
| Cloudflare account | Signed in. 3 Workers, 1 D1 database, 0 zones. The workers.dev subdomain is `gkkrowicki`. |
| DNS provider | Simply.com (`ns1.simply.com` to `ns4.simply.com`) |
| DNSSEC | On. The .com registry has DS records for the domain. |
| DNS records | Apex `A 216.198.79.1` (Vercel). `www` CNAME to Vercel. `pht` CNAME to the PostHog managed proxy. One TXT record for Google Search Console. No MX records. |
| Canonical host | `www.gustavkrowicki.com`. The apex sends a 307 redirect to `www` and keeps the query string. |
| CV links | The CV PDFs use the apex with UTM parameters. Companies have these PDFs, so the apex redirect must always keep the query string. |
| Code | No API routes, no middleware, no server actions. All 17 routes are static. `next.config.ts` has 2 redirects. 13 files use `next/image`. |
| Assets | 547 files in `public` (413 MB). The largest file is 23 MB. |
| Limits | 20,000 files for each Worker version. 25 MiB for each file. |

## 3. Target architecture

```text
Visitor ──▶ www.gustavkrowicki.com ──▶ Worker "portfolio"
                                         ├─ static assets (out/)          free, no Worker run
                                         └─ /api/* (later)
                                              ├─ Durable Object CityRoom   live room (WebSocket)
                                              └─ D1 "guestbook"            guestbook entries

gustavkrowicki.com      ──▶ Redirect Rule, 301 ──▶ www (keeps the query string)
pht.gustavkrowicki.com  ──▶ PostHog managed proxy (DNS only, no change)
```

The browser keeps the progress, the avatar, and the unlocks of each visitor.
The server keeps no data about visitors.

## 4. Tasks for Gustav and tasks for Claude

Gustav does these tasks, because Gustav must sign in for them:

1. Sign in to `cf`. The command `cf auth login` opens a page in the browser.
2. In Simply.com, set DNSSEC to OFF.
3. In Simply.com, change the nameservers.
4. In Simply.com, add the new DS record after the move.
5. Say yes or no to each remote change.

Claude does these tasks:

- The code changes on a branch.
- The local builds and the e2e tests.
- The `cf` commands. Claude does each remote change only after a yes from Gustav.
- The checks after each phase.

## 4a. Time line

| When | Work |
| --- | --- |
| At the start of the redo | Phase 1 and Phase 2 on `feature/portfolio-redo` |
| During the redo | Previews of the redo. Phase 6 (live room and guestbook). |
| 2 weeks before the launch | Phase 3 (DNS to Cloudflare, no visible change) |
| Launch day | Phase 4 (merge the redo into `main`, then the cut-over) |
| 14 days after the launch | Phase 5 (clean-up) |

Phase 3 is not on the launch day, because DNSSEC needs a wait of 48 hours.
Then the launch day has only one DNS change.

## 5. Phase 1: Static export on a branch

This phase is local. It does not change the live site.

Do this phase on `feature/portfolio-redo`.
The redo does not go into `main` before the launch, so these changes do not go live early.

From this phase on, the redo must stay a static export.
Do not use Next.js API routes, middleware, or server actions.
Put all server code in the Worker (Phase 6).

1. Make sure that `feature/portfolio-redo` is the current branch.
2. In `next.config.ts`, add `output: "export"`.
3. In `next.config.ts`, add `images: { unoptimized: true }`.
4. In `next.config.ts`, remove the `redirects()` function.
5. Create `public/_redirects` with these two rules:

   ```text
   /projects/internship-at-valtech-2024  /work/valtech  307
   /projects/*                           /work          307
   ```

6. Create `public/_headers` with this rule:

   ```text
   /_next/static/*
     Cache-Control: public, max-age=31536000, immutable
   ```

7. Create `public/.assetsignore` with the line `**/.DS_Store`.
8. Install the two tools as development dependencies:

   ```bash
   npm install --save-dev cf@1.0.0-beta.17 wrangler@4.151.0
   ```

9. Do not run `npx cf init .`, `npx cf build`, or `npx cf dev` in this project.
   `cf` finds Next.js and then uses the OpenNext adapter, which makes a server build.
   This site is a static export, so `cf` must use Wrangler for the build.
10. Create `cloudflare.config.ts` with these values:

    ```ts
    worker: {
      name: "portfolio",
      compatibilityDate: "2026-10-14",
      previewUrls: true,
      observability: { enabled: true },
      assets: { htmlHandling: "auto-trailing-slash", notFoundHandling: "404-page" },
    }
    ```

11. Create `wrangler.config.ts` with the value `assetsDirectory: "./out"`.
12. Do not add a domain in this phase.
13. Add `/.cloudflare/` and `/.wrangler/` to `.gitignore`.
14. Add these scripts to `package.json`:

    ```json
    "cf:build": "next build && cf-wrangler build",
    "cf:dev": "cf-wrangler dev --port 3100",
    "cf:deploy": "npm run cf:build && cf deploy --prebuilt"
    ```

    `cf-wrangler` is the Wrangler program that `cf` uses for a build without a framework.
    `cf-wrangler build` writes the build output for `cf` to `.cloudflare/output/v0/`.
    `cf deploy --prebuilt` uploads that build output.

15. In `playwright.config.ts`, add the variable `E2E_BASE_URL`.
    If `E2E_BASE_URL` has a value, the tests use the value as `baseURL` and do not start a server.
16. In `.claude/launch.json`, change `portfolio-prod` to `npm run cf:dev`.
    With a static export, `next start` does not work.
17. Run `npm run cf:build`.
18. Run `npx cf deploy --prebuilt --dry-run`. This command sends no data and needs no sign-in.
19. Start `portfolio-prod`, and run the e2e-runner agent on port 3100 (city and smoke).
20. Open these URLs on port 3100. Compare each result with the correct result:

    | URL | Correct result |
    | --- | --- |
    | `/` | Home page, status 200 |
    | `/city` | The city loads |
    | `/work/valtech` | Case page, status 200 |
    | `/projects/foo` | Redirect 307 to `/work` |
    | `/no-page` | The 404 page, status 404 |
    | `/_next/static/<file>.js` | `Cache-Control: public, max-age=31536000, immutable` |

### Images

A static export has no image optimizer.
On Vercel, `next/image` makes small WebP files for each screen width.
On Cloudflare, Image Transformations do this work, through the URL `/cdn-cgi/image/`.

`/cdn-cgi/image/` operates only on a hostname of a Cloudflare zone.
It does not operate on workers.dev or on the local server (test of 2026-10-14: status 404).
Thus, only the build for the live site uses transformations.
Previews and local builds use the original images.

21. Add the loader `lib/cloudflareImageLoader.ts`.
    The loader writes URLs with `width`, `quality=75`, `format=auto`, and `onerror=redirect`.
    If a transformation fails, `onerror=redirect` sends the original image.
    The loader does not change SVG files or absolute URLs.
22. In `next.config.ts`, use the loader only when `CF_IMAGE_TRANSFORMS=1`.
    In all other builds, use `images: { unoptimized: true }`.
23. Add the script `"cf:build:live": "CF_IMAGE_TRANSFORMS=1 npm run cf:build"` to `package.json`.

The live build has 115 unique transformation URLs from 17 images (count of 2026-10-14).
The Free plan includes 5,000 unique transformations each month.

## 6. Phase 2: First deploy to workers.dev

This deploy does not change the live site, because at this time no domain points to the Worker.

1. Gustav: run `cf auth login`.
2. Build the site without the PostHog key. Then PostHog gets no data from the tests:

   ```bash
   NEXT_PUBLIC_POSTHOG_KEY= npm run cf:build
   ```

3. Deploy the build:

   ```bash
   npx cf deploy --prebuilt --message "First static export"
   ```

4. Open `https://portfolio.gkkrowicki.workers.dev`.
5. Make sure that the browser sends no request to `pht.gustavkrowicki.com`.
6. Run the e2e-runner agent with `E2E_BASE_URL` set to the workers.dev URL (city and smoke).
7. Compare the page weight with the Vercel site on a phone profile.
   The preview uses the original images, so the preview is heavier than the Vercel site:

   | Page | Vercel | Preview (2026-10-14) |
   | --- | --- | --- |
   | `/` | 8.2 MB | 10.8 MB |
   | `/about` | 3.1 MB | 4.6 MB |
   | `/work/valtech` | 1.3 MB | 2.3 MB |

   The live build in Phase 4 uses transformations. Do this comparison again in Phase 4.
8. Replace `public/images/about/Dortmund.png` (20 MB) with a smaller file.
   A preview loads this file at its full size.
   Done on 2026-10-14: `Dortmund.jpg`, 1512 x 2016 pixels, 568 KB, without photo metadata.
9. Open the workers.dev URL on a phone. Make sure that the city and the 3D models load.

NOTE: A workers.dev URL is public.
The rule `https://:version.:subdomain.workers.dev/*` in `public/_headers` adds `X-Robots-Tag: noindex` to all workers.dev URLs of the Worker.
The rule does not apply to `www.gustavkrowicki.com`.
During the redo, deploy a preview of the redo with `npx cf previews deploy --prebuilt`.
The preview URL of a branch stays the same after each deploy.

## 7. Phase 3: Move the DNS to Cloudflare

After this phase, the Cloudflare nameservers give the DNS answers.
Visitors see no change, because the records continue to point to Vercel.

CAUTION: Set DNSSEC to OFF at Simply.com before you change the nameservers.
If the DS records stay at the registry, resolvers that validate DNSSEC cannot find the site.

1. Gustav: in Simply.com, set DNSSEC to OFF for `gustavkrowicki.com`.
2. Wait 48 hours.
3. Make sure that this command shows no result:

   ```bash
   dig +short DS gustavkrowicki.com
   ```

4. Claude, after a yes from Gustav: add the zone to the Cloudflare account with `npx cf zones create` (type `full`).
5. Record the 2 nameservers that Cloudflare gives for the zone.
6. Show the records in the new zone:

   ```bash
   npx cf dns records list --zone gustavkrowicki.com
   ```

7. Make sure that the zone has these 4 records and no other records.
   Create a missing record with `npx cf dns records create`.
   Set "proxied" to false on all 4 records.

   | Type | Name | Content |
   | --- | --- | --- |
   | A | `gustavkrowicki.com` | `216.198.79.1` |
   | CNAME | `www` | `c6cf30d4f89b027b.vercel-dns-017.com` |
   | CNAME | `pht` | `3a9143c196a20c109d76.cf-prod-eu-proxy.europehog.com` |
   | TXT | `gustavkrowicki.com` | the `google-site-verification` value |

8. For each name, compare the answer from a Cloudflare nameserver with the answer from Simply.com:

   ```bash
   dig +short www.gustavkrowicki.com @ns1.simply.com
   dig +short www.gustavkrowicki.com @<cloudflare-nameserver>
   ```

9. Gustav: in Simply.com, change the nameservers to the 2 Cloudflare nameservers.
10. Wait until `npx cf zones get --zone gustavkrowicki.com` shows the status `active`.
    The time for this can be 24 hours.
11. Make sure that the site on Vercel continues to open.
12. In PostHog, make sure that PostHog gets new events through `pht`.
13. Set Image Transformations to ON for the zone:

    ```bash
    npx cf zones image-resizing edit --zone gustavkrowicki.com --value on
    ```

14. Make sure that `npx cf zones image-resizing get --zone gustavkrowicki.com` shows the value `on`.

The `pht` record must always stay DNS only.
The PostHog proxy gets its certificate through this record.

## 8. Phase 4: Cut-over

Do the cut-over at an hour with a small number of visitors. PostHog shows these hours.
For approximately one minute, visitors cannot open the site.

1. Merge `feature/portfolio-redo` into `main`.
   Vercel then serves the new portfolio on the live domain.
2. Prepare the Worker on `main` before you change the DNS:

   - Add `domains: ["www.gustavkrowicki.com"]` to `cloudflare.config.ts`.
   - Build the site with the PostHog key and the transformations: `npm run cf:build:live`.

3. Delete the `www` CNAME record with `npx cf dns records delete`.
   A Worker domain cannot use a name that has a CNAME record.
4. Deploy immediately:

   ```bash
   npx cf deploy --prebuilt --message "Cut-over to www"
   ```

5. Change the apex A record to `192.0.2.0`, and set "proxied" to true.
   This address is a placeholder. Cloudflare does the redirect, and the request does not go to this address.
6. Add a Single Redirect rule in the zone with these values:

   | Field | Value |
   | --- | --- |
   | When | `http.host eq "gustavkrowicki.com"` |
   | Target | `concat("https://www.gustavkrowicki.com", http.request.uri.path)` |
   | Status | 301 |
   | Query string | Keep |

   To find the command, run `npx cf cli search "create a redirect rule"`.
   To see the request body, run `npx cf schema` with the command name.

7. Do these checks:

   | Check | Correct result |
   | --- | --- |
   | `curl -sI "https://gustavkrowicki.com/work?utm_source=resume&utm_campaign=test"` | 301, and the location is `www` with the same query string |
   | `curl -sI https://www.gustavkrowicki.com` | 200, and the server is `cloudflare` |
   | `curl -sI https://www.gustavkrowicki.com/projects/foo` | 307 to `/work` |
   | PostHog live events | A pageview with the UTM values from the first check |
   | `curl -sI` on an image URL that starts with `/cdn-cgi/image/` | 200, a `cf-resized` header, and a smaller `content-length` than the original |
   | Page weight of `/`, `/about`, and `/work/valtech` on a phone profile | Not more than the Vercel values in Phase 2 |
   | e2e-runner with `E2E_BASE_URL=https://www.gustavkrowicki.com` | All city and smoke tests pass |

8. Commit the change to `cloudflare.config.ts` on `main`.

### Rollback

If the result of a check is not correct, move the site back to Vercel.
The Vercel project keeps its domains, and Vercel serves `main` with the new portfolio.
Thus, the rollback keeps the new portfolio, and it is complete in approximately 5 minutes.

1. Remove `domains` from `cloudflare.config.ts`, and deploy again.
2. Create the `www` CNAME record to Vercel again. Set "proxied" to false.
3. Change the apex A record to `216.198.79.1`. Set "proxied" to false.
4. Delete the redirect rule.

## 9. Phase 5: Clean-up

Start this phase after 14 days without problems.

1. Set DNSSEC to ON for the zone with `npx cf dns dnssec edit`.
2. Gustav: add the DS record from Cloudflare in Simply.com.
3. Gustav: in Vercel, disconnect the Git repository and remove the domains.
4. Gustav: delete the Vercel project after 30 days.
5. Add a GitHub Actions workflow that deploys `main` with `cf`.
   Use an account-owned API token with only the permission to edit Workers.
   Put the token and the two `NEXT_PUBLIC_POSTHOG_*` values in the GitHub secrets.

Until you add the workflow, deploy from the computer with `npm run cf:deploy`.

## 10. Phase 6, later: Live room and guestbook

Start this phase when the code for the live room and the guestbook is complete.

The Worker gets an entry point, `worker/index.ts`.
In `cloudflare.config.ts`, the value `assets.runWorkerFirst: ["/api/*"]` sends only `/api` requests to the Worker code.
All other requests go directly to the static assets.

Live room:

- `/api/room` opens a WebSocket to one Durable Object, `CityRoom`, for the full city.
- Declare the class with `exports.durableObject({ storage: "sqlite" })`.
- Use the WebSocket Hibernation API. Then a room without messages has no cost.
- The browser sends a position message only when the avatar moves, with a maximum of 5 messages each second.
- The room has a maximum of 30 visitors.
- The room keeps no messages and no IP addresses.

Guestbook:

1. Create the database with `npx cf d1 create`. Record the database ID.
2. Create the first migration with `npx cf d1 migrations create`.
3. Apply the migration with `npx cf d1 migrations apply`.
4. A new entry gets the status `pending`.
5. To show an entry on the site, Gustav sets its status to `approved` with this command:

   ```bash
   npx cf d1 query <DATABASE_ID> --sql "UPDATE entries SET status = 'approved' WHERE id = <ID>"
   ```

Protection against spam:

- Add a Turnstile widget to the guestbook form.
- Upload the Turnstile secret with `npx cf deploy --secrets-file .secrets.json`.
- Add `.secrets.json` to `.gitignore`.

Logs: run `npx wrangler tail portfolio`.

CAUTION: After a change to a Durable Object class, you cannot deploy a version from before the change.
Do a test of each class change on a preview before you deploy it.

### Free plan limits for Phase 6

| Service | Free plan limit | Expected use |
| --- | --- | --- |
| Static asset requests | No limit, no cost | All pages and all assets |
| Worker requests | 100,000 each day | Only `/api` requests |
| Durable Objects requests | 100,000 each day. 20 incoming WebSocket messages count as 1 request. | 1 visitor who moves for 1 hour at 5 messages each second = 900 requests |
| Durable Objects duration | 13,000 GB-s each day. This is approximately 28 hours of one active object. | One room object |
| D1 | 5 million rows read and 100,000 rows written each day, 5 GB | Guestbook only |

## 11. Changes for daily work

- A push to `main` does not deploy the site until you add the GitHub Actions workflow.
- `next start` does not work. Use `npm run cf:dev`.
- Do not use `npx cf init .`, `npx cf build`, or `npx cf dev`. Use the `cf:` scripts in `package.json`.
- Previews and local builds use the original images. Only `npm run cf:build:live` uses Image Transformations.
- The redirects are in `public/_redirects`, not in `next.config.ts`.
- Vercel made a preview for each branch. With `cf`, run `npx cf previews deploy`.
- Each file in `public` must be smaller than 25 MiB. Put a larger file in R2.

## 12. Open decisions

1. The base of the branch: `feature/portfolio-redo` (decided 2026-10-14). The host changes at the launch of the redo.
2. The images: Image Transformations through `/cdn-cgi/image/` for the live build only (decided 2026-10-14). The Worker does not need code for images.
3. The deploy: add GitHub Actions before the cut-over, or after the cut-over.
4. The canonical host: keep `www`, because the PostHog data uses `www`.
