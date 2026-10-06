## Live site

Blog: https://momnasticism.com
Writer’s desk: https://momnasticism.com/admin
Repository: https://github.com/joeldunnesq-sudo/momnasticism

The shop is a coming-soon page. Posts written in the writer’s desk are stored in Cloudflare D1. Page-specific SEO metadata, structured data, RSS, and a publication-aware sitemap are automatic. The sign-in email allowlist is stored privately in Cloudflare.

# Momnasticism

An Orthodox mother's journal, built around the approved ivory, olive, and dusty-rose design and feminine logo. Server-rendered TypeScript on **Cloudflare Workers with Static Assets**, **D1** for entries, and **R2** for photos. No separate web server. This is a Workers project, not a static Cloudflare Pages upload.

## Included

- About page editor for all four photos, accessibility descriptions, biography, story, quote/source, caption, and button text; explicit live saves, local recovery, and conflict detection.
- Responsive homepage, journal archive, individual entries, About Stephanie, RSS feed.
- Private `/admin` writer's desk with Cloudflare Access email sign-in.
- Markdown editor with formatting buttons, inline images, cover images, alt text, and preview.
- Automatic server saves for drafts; local recovery copies for interrupted writing.
- Explicit publishing, updating, unpublishing, deletion, conflict detection, and saved-version recovery.
- Draft-only photos are authenticated; published photos become publicly accessible.
- JSON export of posts, revisions, and photo inventory. Photo bytes require a separate R2 backup.
- Automated GitHub checks and repeatable Cloudflare deployment.

The journal includes four editable sample entries from the approved mockup. The homepage subscription form connects to the MailerLite “Momnasticism readers” group using its public form endpoint and browser JSONP submission. Double opt-in is enabled in MailerLite; existing active readers do not need to reconfirm. Successful submissions open `/subscribe/check-email`. Automatic new-post emails require a separately configured MailerLite RSS campaign; signup success alone does not activate that campaign. Fonts load from Google Fonts; self-host if desired.

## Local development

Requires Node.js 22+.

```bash
npm ci
cp .dev.vars.example .dev.vars
npm run db:local
npm run dev
```

Open `http://localhost:8787`, then `/admin`. The explicit local development bypass works only over HTTP on localhost/127.0.0.1. Never configure `LOCAL_DEV_AUTH` in production. Production authorization fails closed until Access is configured.

```bash
npm run check
npm test
npm run build
```

## Cloudflare setup

1. Sign in with `npx wrangler login`.
2. Create the database and photo bucket:

```bash
npx wrangler d1 create momnasticism
npx wrangler r2 bucket create momnasticism-photos
```

3. Replace `REPLACE_WITH_D1_DATABASE_ID` in `wrangler.jsonc` with the returned ID. Enable R2 in your account if prompted. Keep the R2 bucket private; do not turn on an R2 public URL.
4. Set `SITE_URL` to the actual canonical domain you own. The example `momnasticism.com` is not a claim of availability or registration.
5. Run `npm run db:remote` and `npm run deploy`.
6. Attach your domain to the Worker in Cloudflare's Workers dashboard (Settings → Domains & Routes → custom domain).

### Admin login: Cloudflare Access

In Cloudflare Zero Trust, enable **One-time PIN** as a login method or use your preferred identity provider. Add one **Self-hosted Access application** with all of these paths on your actual site domain:

- `yourdomain.com/admin`
- `yourdomain.com/admin/*`
- `yourdomain.com/api/admin/*`

Use one application so all paths share the same application AUD. Add an **Allow** policy including only Stephanie's email and your email. Do not create an Everyone or Bypass policy. Choose a reasonable session duration (for example, 24 hours).

Set these variables in `wrangler.jsonc` (or matching Worker variables):

- `ACCESS_TEAM_DOMAIN`: your exact `yourteam.cloudflareaccess.com` hostname, without `https://`.
- `ACCESS_AUD`: the Application Audience tag from that Access application.
- `ADMIN_ALLOWLIST`: store the comma-separated allowed writer emails as a Cloudflare secret, never in the public repository. The Worker independently checks this allowlist. The older `ADMIN_EMAILS` binding is supported for migration.

Redeploy. Visiting `/admin` now shows Cloudflare's sign-in screen. The Worker verifies the signed Access JWT's issuer, audience, expiry, algorithm, and email; direct workers.dev requests cannot bypass authorization. Configure Access on any additional hostname you use for admin access, or use the custom domain for administration.

No passwords or Cloudflare API tokens go in the repository. All admin writes require same-origin requests with a custom header. Markdown escapes raw HTML and rejects dangerous URL schemes. Image uploads accept raster formats only, up to 10 MB. Draft privacy is prospective: an image or entry already viewed publicly cannot be recalled from a visitor's device.

## GitHub and deployment

Create an **empty private GitHub repository** named `momnasticism` and push this folder:

```bash
git remote add origin https://github.com/joeldunnesq-sudo/momnasticism.git
git push -u origin main
```

If you download the ZIP, it excludes `.git`; initialize it first:

```bash
git init -b main
git add .
git commit -m "Build Momnasticism journal and writer's desk"
```

For automatic deployment, connect the repo in Cloudflare **Workers Builds**. Use `npm ci` for dependency installation, `npm run check && npm test && npm run build` for build, and `npm run deploy` for deployment. Create D1/R2 and run migrations before the first deployment. Review and apply future migrations separately before deploying dependent changes.

Git tracks site code, styles, and bundled brand assets. **Posts written in the editor live in D1 and are not automatically committed to GitHub.** They survive code deployments. Use writer's-desk exports and D1 backups to protect writing.

## Backups and restore

- The writer's desk Download backup exports entries, revisions, and photo inventory as JSON.
- For a directly restorable database export:

```bash
npx wrangler d1 export momnasticism --remote --output=backup.sql
```

- Restore SQL into a new empty D1 database using `wrangler d1 execute NEW_DATABASE --remote --file=backup.sql`; bind that database to the Worker after verification.
- Independently copy all objects from the private R2 bucket using an S3-compatible backup tool. JSON export does not contain image bytes. Keep backups and tokens out of Git.
- D1 Time Travel is another recovery option; configure and verify its retention for your account.
- A saved-version restore loads older text into the editor; it does not publish automatically.

## Editing the design

- `public/style.css`: palette, fonts, responsive layout.
- Writer’s desk → **Edit About page**: edit About text and replace/remove photos without a code deployment.
- `src/pages.ts`: initial About content defaults.
- `src/views.ts`: page layouts and homepage copy.
- `public/logo.png`: approved feminine logo on a transparent background.
- `public/hero.png`: matching generated editorial still life.
- `public/admin.js`: editor workflow.
- `src/index.ts`: routes, persistence, uploads.
- `src/auth.ts`: Access validation.

The image concept is recreated with real responsive HTML; lettering uses Cormorant Garamond as a practical approximation of the generated design. The generated logo itself is preserved.


## About page editor rollout

Apply migration `0003_pages.sql` with `npm run db:remote` before deploying this change. The existing About text and photos remain the defaults until the first admin save. Page content is stored in D1 and included in Download backup; uploaded photo bytes remain in R2. Photos become public only after the page is saved with them and become private again when no live page or entry references them.
