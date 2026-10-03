# Validation — October 3, 2026

- TypeScript check passed.
- Ten automated tests passed, including the editor workflow, publishing lifecycle, draft/photo privacy, authorization, same-origin mutation protection, safe Markdown, SEO escaping, and private-preview metadata.
- Sitemap tests verify that drafts are excluded and published posts are included.
- Wrangler deployment dry run passed.
- Created the Momnasticism D1 database and private R2 photo bucket; applied the initial production migration.
- Deployed to https://momnasticism.com using a Cloudflare Worker custom domain.
- Created the approved Cloudflare Access application for the writer desk, previews, and admin API. The Worker verifies the Access JWT and independently checks a private email allowlist.
- Confirmed the public homepage and coming-soon shop render in a browser. Homepage images load, canonical metadata is correct, and the desktop document does not overflow at 1440 pixels.
- Confirmed /admin redirects to the correct Cloudflare email-code login screen. An authenticated production writing session still needs the owner to sign in.
- Search Console property was available and the sitemap submission was accepted. Its initial read returned a fetch warning despite public HTTP 200 XML responses. Google live URL inspection confirmed that the homepage is available and can be indexed; Google accepted the homepage indexing request into its priority crawl queue. Indexing and rankings depend on Google.


- All four supplied photographs are displayed on the homepage/About page using responsive JPEG copies without original EXIF metadata. Phone-width layout checked at 390 pixels without horizontal overflow.
- The complete original supplied logo is displayed in the header, and the site has SVG/PNG favicons and an Apple touch icon.
- www and trailing-slash URLs redirect permanently to the canonical URLs.

