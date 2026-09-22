# Peter Sanjur — local website concept

A locally runnable, responsive portfolio alternative. The authored website is in `dist/`; there is no build step or dependency installation.

## Preview

Run `python3 -m http.server 4173 --bind 127.0.0.1 --directory dist` from this directory and open http://127.0.0.1:4173/.

## Implemented

- Cinematic homepage with Peter's existing photography and a masked opening reveal.
- 25 portfolio entries with 278 photographs and 23 films, original project breakdowns, accessible full-screen galleries, direct hash links, next-project navigation, and Escape-to-close.
- About section and capability accordions.
- Shop coming-soon note in the footer.
- Validated inquiry form that sends directly through Formspree; direct email and Instagram links.
- Mobile layouts, keyboard focus states, reduced-motion support, and an explicit motion toggle.

## Content and launch decisions

This is a reviewable concept, not a deployed replacement. Original photography and campaign facts were obtained from Peter's public website on 2026-09-20. See `ASSET-SOURCES.md`. Project descriptions and credits are copied from the original portfolio; projects without descriptions remain photos-only. All 181 gallery entries across 14 source records are represented, plus two unique Moon Rocks featured/cover frames. About copy remains proposed copy for Peter to review.

The inquiry form posts to a Google Apps Script web app (`integrations/inquiries.gs`) and shows a confirmation on the page. The script emails each inquiry to info@petersanjur.com with the visitor's address as Reply-To, and adds it to the Client Submissions database ("tally") on the Creator Quest page in Notion: Name, Email, Project Type, Project Date, Budget Range, Project Description, Customer Journey = New Submission, and Source = Website. The optional budget dropdown offers $1,000–$2,500, $2,500–$5,000, $5,000–$10,000, and $10,000+, matching the Notion Budget Range options exactly (older options stay in Notion for past rows). Email and Notion are attempted independently, so one failing never loses the inquiry, and the email notes whether the Notion row was created. Until the web app's `/exec` URL is set as the `action` of `#inquiry-form` in `dist/index.html`, submitting opens a prefilled email draft instead. A hidden `_gotcha` field filters simple spam bots. "When are you thinking?" is an optional native date picker (no past dates); the date is sent as `preferred_date` in YYYY-MM-DD form and added to the subject, for example "Project inquiry — Studio inquiry — Name — Sun, Mar 14, 2027", so inquiries sort and scan by date. The form does not reserve dates or connect to a calendar.

### Contact form: email and Notion setup

1. Notion: at notion.so/profile/integrations create an internal integration named "petersanjur.com inquiries" and copy its secret. Open Client Submissions on Creator Quest, then ••• → Connections → add that integration.
2. Google: signed in as the account for info@petersanjur.com, create a project at script.google.com and paste in `integrations/inquiries.gs`. Under Project Settings → Script properties, add `NOTION_TOKEN` with the secret.
3. Select `checkSetup` and click Run. Approve Google's permission prompts; a "setup check passed" email confirms both connections.
4. Deploy → New deployment → Web app, Execute as: Me, Who has access: Anyone. Put the `/exec` URL in the form's `action`.

The Notion secret lives only in the script's properties; never commit it.

The shop lives in the footer as a coming-soon note with an inquiry link; the full shop section was removed from the page and navigation. It has no invented products, prices, checkout, or payment processing. Add confirmed products, fulfillment details, and a checkout provider before opening sales. Add motion work when the chosen reel and film credits are available.

Fonts currently use Google Fonts (DM Sans throughout), with system fallbacks. All photography is stored locally. No analytics or tracking has been added. Review final copy, location, accessibility, privacy needs for any future integrations, and image selections before deployment.

## Editing

- `dist/index.html`: page structure and copy.
- `dist/styles.css`: visual direction and responsive behavior.
- `content/portfolio.json`: imported project text, ordered galleries, and original source URLs.
- `scripts/build-portfolio.py`: regenerate the homepage project cards, `dist/portfolio-data.js`, one page per project under `dist/portfolio/<slug>/`, and `dist/sitemap.xml` with `python3 scripts/build-portfolio.py`. Run it after editing `content/portfolio.json`.
- `dist/app.js`: project galleries, inquiry form, motion.
- `dist/assets/`: photography.

The site is published from `dist/` to GitHub Pages by `.github/workflows/pages.yml` on every push to `main`. All internal paths are relative, except `dist/404.html`, which GitHub serves at any missing address and therefore uses root-relative links.

## September revision: motion and Studio

The portfolio uses a changing photographic montage with a prominent Peter Sanjur identity, followed by a regular two-column gallery (one column on mobile). Project titles sit beneath the covers, and opened galleries preserve each photograph’s aspect ratio. The four annotated hero text overlays are removed. A roughly three-second opening name reveal plays once per browser session and can be skipped, dismissed with Escape, or replayed from the footer. Reduced-motion preferences bypass it; scroll-based image movement and project reveals also respect the motion toggle.

`dist/studio.html` integrates the fuller ARTCORE Studio design recovered from the parent of commit `b0f4b08` in the user-supplied ARTCORE repository. The current source page is an unavailable/redirect stub. The original repository was read only and remains unchanged. The page is now branded as Peter Sanjur's studio (no ARTCORE name) and redesigned with a dark, editorial look inspired by lamalama.com: a charcoal and cream palette, oversized Arial headlines, DM Sans statement paragraphs with an indented first line, small system-mono labels in brackets, and a dot-screen texture that clears from the hero walkthrough and sits over the gear section's backdrop. It keeps the portfolio's top bar. Rooms are listed as expandable rows with photo strips, gear and FAQs use the same row style, a live Dallas clock sits in the hero and footer bars, and a floating Inquire card with the short loft clip folds away after the hero (hidden under 1100px). All nine space photos, all five work photos, and both videos are used; photographs can be enlarged in a keyboard-accessible dialog.

Studio is inquiry-only in this local concept. No availability, payment, or reservation system is connected. Older $75/hour pricing and cancellation commitments are not advertised as current; rates and terms are confirmed directly. Studio details, equipment, gallery credits, two-hour minimum, and permission to accept inquiries need review before deployment. Requests flow into the portfolio's inquiry form with Studio inquiry preselected.

The Studio walkthrough is a locally encoded H.264 MP4 without audio. It pauses offscreen, when the tab is hidden, when a photograph is enlarged, or when the visitor pauses motion. The original source video remains unchanged.

The Studio page uses plain `studio.css` and `studio.js`. It no longer loads the old Tailwind utilities; the previous utility build sources remain only as reference.

Earlier portfolio designs are retained under `.design-history/v1/`, `.design-history/v2/`, `.design-history/v3/`, and `.design-history/v4/` for reference.

The old CMS references a Moon Rocks video URL that failed to download. Its source is retained in `content/portfolio.json` under `unavailableSourceFilms`; no broken video player is shown. All project photographs downloaded and were checked. Gallery images use local, uncropped JPEGs up to 2000px; index covers use 1000px derivatives and lazy loading.

## Homepage montage and future reel

The opening uses five collections of three panels, including America, Julia, and Rebirth, and silent loops from Susan Shaw (Al Fresco Lunch) and Avara (Fall) in place of stills. It has staggered mask transitions every three seconds (slides with a clip hold until the clip ends), manual previous/next controls, and an immediately available motion toggle. Autoplay pauses when offscreen, when a project is open, when a project link has keyboard focus, and when the tab is hidden. Reduced-motion preferences keep the imagery static. The skippable name intro types PETER SANJUR at full size in its final position, with a blinking caret, then two curtains rise to reveal the montage.

`dist/hero-settings.js` controls the image selections, panel clips, interval, and optional reel. Panel clips are six- to seven-second silent H.264 cuts in `dist/assets/hero/` with first-frame posters; they play only while motion is on and the hero is visible, hold their slide until the clip ends, and fall back to the poster if they fail to load. To add a reel, place a browser-compatible H.264 MP4 under `dist/assets/`, then set `videoSrc` and `videoPoster`. The default is still photography. A configured video loads muted and looping, with the same pause control; failed video loads restore the photo montage. For the edit, aim for a short loop that works without sound and keep key subjects away from the extreme edges for mobile crops.

Validation for this revision: desktop and 390px mobile layouts, photo enlargement and Escape close, native FAQ, Studio inquiry preselection, montage autoplay/manual navigation and motion toggle, and the optional reel path with a local video fixture and a deliberately unavailable source to verify the photo fallback. Temporary test fixtures are removed after verification.

## Refined opening and scroll motion

The opening types the name letter by letter on a dark screen, exactly where the hero title sits, then two panels rise to reveal the montage underneath it. Replay is in the footer.

The regular gallery layout has been restored. `dist/scroll-motion.js` adds one restrained entrance as headings, photographs, and copy enter from below: 24px upward movement over 900ms and a 4px blur clearing over 750ms, each with gentle easing. Elements remain clear after entering, with no word masks, scaling, or staggered gallery positions. Motion controls and reduced-motion preferences bypass the effect; keyboard focus immediately clears it.

The About portrait is the user-supplied 2026 self-portrait, copied without modification to `dist/assets/peter-self-portrait-2026.jpg`. Its full landscape composition and original tone are preserved across desktop and mobile.

The previous editorial layout is retained in `.design-history/v6/` for reference.

## Shared accent color

`dist/palette.css` adds a shared vermilion accent to the portfolio: `#ff5c35` on dark backgrounds, `#bd361b` on light backgrounds, and `#fae8df` as a light tint. Section labels, project arrows, contact links, and buttons share these colors. Header and hero type (PS, Contact, the hero label, and slideshow controls) stays white over the photographs.

## Recent client work

The newest entries are Ro$ama — My Forte (19 Instagram exports), Susan Shaw (19 films), Avara (two films), and Brick (nine supplied photographs). Susan Shaw is one client page with Pre-Spring, Spring, Summer, and Fall sections. Avara is one client page with Denim and Fall sections. Campaign buttons jump directly to each section. Ro$ama includes the supplied collaboration, lighting, and BTS credits.

Films are H.264/AAC MP4 with playback controls and no autoplay. Campaign pages initially load poster images, creating a native video player only when a visitor presses Play; switching films or closing a project releases the previous player. Original image and video aspect ratios are preserved. Project and media counts are generated from content.

`content/recent-project-intake.md` lists the selected Susan Shaw exports and all seventeen files in the Brick Web folder, identifying the nine included. Latest versions were inferred from export filenames; earlier iterations, clip batches, and alternate voiceover/overlay versions are excluded. `content/susan-shaw-import.json` and `content/recent-asset-sources.json` preserve exact source mappings. Original files remain unchanged.

Peter confirmed billboard placements in Times Square, New York, and Los Angeles; both are included in the project description. No recent-project details remain pending.

## Social preview

`dist/index.html` includes Open Graph and Twitter card tags so shared links show `dist/assets/share/julia.jpg`, a 1200×630 crop of the Julia cover. The tags use absolute `https://www.petersanjur.com/` URLs; update them if the site launches on a different domain.

## Hosting, domain, and search

GitHub Pages hosts the site; the petersanjur.com registration and DNS stay at Wix. In Wix, the root domain's A records point to GitHub Pages (185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153) and `www` is a CNAME to `peterasanjur-ctrl.github.io`. The Google Workspace MX record, the SPF record, and the Google site-verification TXT record must stay unchanged so email and Search Console keep working. The primary address is `https://www.petersanjur.com/`.

Every project has its own crawlable page. The 14 projects imported from Wix keep their old `/portfolio/<slug>` addresses, so existing search results still land; newer projects use their content key as the slug. On the homepage, a plain click still opens the project in place (`#project/<key>`), while modified clicks and crawlers follow the real page. The old Wix booking addresses (`/book-online`, `/booking`, `/booking-1`) redirect to the studio page.

Search details: `dist/robots.txt` points to the sitemap; every page has a canonical URL and description; the homepage carries Person and WebSite structured data, the studio page carries LocalBusiness data (no postal code or hours are claimed), and each project page carries CreativeWork data. The studio share image is `dist/assets/share/studio.jpg`.

### Studio bookings

The form at the bottom of `studio.html` posts to the same Apps Script with `form_kind=studio`. Each request:

- adds a "Studio inquiry" row to Notion with the date and hours as a time range, plus phone, activity, headcount, gear, and notes
- emails Peter the details with a **Review & approve** link (replying to that email goes straight to the client)
- emails the client a receipt (their replies come back to info@petersanjur.com)

The review link opens a page that flags any calendar overlap. **Approve & add to calendar** creates the event on Peter's default Google Calendar, invites the client, and emails them a confirmation. Approval is a button rather than a link, so email link scanners can't approve by accident, and review links are signed with a key stored in the script's `SIGNING_KEY` property. The calendar needs one-time permission: run `checkSetup` in the Apps Script editor after updating the code.
