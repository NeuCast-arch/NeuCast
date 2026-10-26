# NeuCast: four shape-function pages added

On top of Calm Geometry, each remaining shape in the design system now has a dedicated page
reachable from the main nav, in the same vanilla HTML/CSS/JS + Firebase architecture as the rest
of the site (no new framework or dependency):

| Shape | Page | What it does |
|---|---|---|
| Rectangle | `archive.html` | Filters announcements by status (expired / read / unread), scope and date range; a "View full details" disclosure per card. Reads the existing announcement data — no new storage. |
| Pentagon | `feedback.html` | A five-pentagon rating control, plus a suggestion / bug-report form with inline validation and toast confirmation. New data: `neucast_feedback`, synced like Questions. |
| Trapezoid | `careers.html` | Internship/OJT and career-event listings (a new `careers` announcement category) with "Apply now" and "Save opportunity" actions, filterable by program. New data: `neucast_saved_<id>`, `neucast_applied_<id>` (per student). |
| Parallelogram | `safety.html` | Hazard, closure and health/clinic bulletins (a new `safety` announcement category, shown together with `urgent`), with high-contrast styling and a pulse on anything needing immediate attention. |

Admins manage Careers & Safety posts from the same **New announcement** form (two new categories,
plus an optional "Apply link" field); Feedback submissions get their own **Feedback** tab on the
admin dashboard, next to Questions. `cloud.js` was extended so feedback syncs across devices the
same way students and questions already do.

## Earlier: "Calm Geometry" redesign

### What changed and why
| Goal | What was done |
|---|---|
| **Advanced skeleton loaders** | `skeleton.css` + `NeuSkeleton` in `ui.js`. Placeholders match the real layout (announcement cards, progress ring, calendar, filters, admin stats/rows, profile form). Soft shimmer, stops with "reduce motion", one hidden "Loading..." for screen readers. `boot.js` lets the page paint before the blocking cloud download, so skeletons are actually seen. Buttons show a spinner while saving (`NeuUI.busy`) |
| **Semantic colors** | Three separate color jobs in `tokens.css`: brand (indigo = actions only), status (green = confirmed, amber = needs attention, red = error, blue = information) and category identity (indigo / magenta / red / slate-teal, always paired with its shape). Mint no longer means both "General" and "confirmed"; yellow is no longer decoration. Every status also has an icon + words |
| **Less clutter, minimal spacing** | Removed the marquee, halftone, tilted stickers, hard shadows, all-caps, hero shapes, shape strip, "pick a shape" panel and shape pop-up. Categories now appear once, as filter chips with their shape. Announcements are visible immediately. One quiet side column (progress, needs-you, calendar). The geometry calculator is kept, collapsed |
| **Not harsh on the eyes** | Soft off-white page (#F5F6F8) and charcoal text (#1C2430) instead of pure black/white; hairline 1px borders; no heavy shadows; dark theme uses deep blue-gray (#12151C) with soft white text; follows the device setting by default |
| **Accessibility** | AA contrast verified (590 rendered text elements, 0 failures, light + dark); visible 2px focus ring; skip links; landmarks; real labels; inline field errors with `aria-invalid`; pop-ups trap focus, close on Escape and return focus; admin tabs use ARIA + arrow keys; calendar days have spoken labels; `confirm()`/`alert()` replaced with accessible dialogs; 44px touch targets; text size and reduced-motion respected; forced-colors support; no horizontal scroll at 320px |

## New / replaced files
New: `skeleton.css`, `theme.js`, `ui.js`, `boot.js`, `calc.js`.
Rewritten: `tokens.css`, `base.css`, `components.css`, `home.css`, `auth.css`, `admin.css`, all five `.html` pages, `script.js`, `calendar.js`, `login.js`, `register.js`, `profile.js`, `admin.js`.
Removed (no longer used): `style.css`, `neo.css`, `minimal.css`, `recovery.css`, `recovery.js`.
`data.js`, `cloud.js`, `cloud-config.js`: unchanged. `icons.js`: added a few icons.

## Bugs fixed on the way
- `index.html` loaded `script.js` twice, so every click ran twice (a sent question was saved twice).
- Fake footer links ("Privacy Policy", "Terms", "Contact Us") were plain text; replaced with real buttons.
- The homepage now redraws when data arrives from another device (cloud sync).
- Admin: a sync no longer wipes a reply the admin is typing.

## Settings
Settings now has Appearance (System / Light / Dark), Text size and "Hide announcements I've read". Old saved settings keep working.
