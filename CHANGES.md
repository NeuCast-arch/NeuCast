# NeuCast – Neo-brutalism, Phase 1 (home page)

Drop these files into your existing `CampusConnect/` folder (overwrite when asked).
Keep your images, `data.js` settings, and the other pages as they are.

## New files
| File | Job |
|---|---|
| `tokens.css` | All design tokens: colors, 4px border, hard shadows, motion, category colors |
| `base.css` | Reset, Space Grotesk, graph-paper texture, focus ring, `.shape` outlines, reduced motion |
| `components.css` | Reusable `.nb-btn`, `.nb-card`, `.nb-badge`, `.nb-chip`, `.nb-input`, `.nb-panel`, `.nb-modal` |

## Replaced files
| File | What changed |
|---|---|
| `home.css` | Rewritten: page layout only. Replaces the old `home.css` AND the home-page parts of `neo.css` |
| `index.html` | Loads the 4 new stylesheets; sidebar removed; marquee, filter bar and progress-ring slots added |
| `script.js` | Small edits: sidebar -> filter chips, ring -> right panel, Settings in top nav, component classes on cards/buttons |

`data.js`, `calendar.js`, `icons.js` are unchanged copies.

## Not touched yet (Phase 2)
`style.css`, `neo.css`, and `login / register / profile / admin` pages. They still use the old
files and keep working. Phase 2 moves them onto the same tokens and components, then deletes
`neo.css`.

## Change a color in one place
Open `tokens.css`. Category colors are `--cat-academic-c`, `--cat-events-c`, `--cat-urgent-c`, `--cat-general-c`.

# Wide-screen redesign (full-width layout)
| File | What changed |
|---|---|
| `tokens.css` | `--container` raised 1360px -> 2400px; `--gutter` now fluid `clamp(16px, 3vw, 56px)` |
| `home.css` | Fluid right rail and gaps, bigger hero type and shapes, full-width shape panel, denser announcement grid, topbar fix for 900-1100px |
| `style.css` | Admin dashboard widened (900px -> 2400px), 4-across stat boxes, 2+ column lists, compact tabs on phones |
| `admin.html` | "Questions" tab button moved into the tab bar (same button, same ids). No JS changed |

No JavaScript file was modified. Login, register, profile and all data logic are untouched.

# Login and register redesign (Neo-brutalism)
| File | What changed |
|---|---|
| `auth.css` | NEW. Layout for both pages: poster / form split (poster fills its full height with four stretching category cards), message box, selects. Everything else comes from `tokens.css`, `base.css`, `components.css` |
| `login.html`, `register.html` | New markup using `.nb-panel`, `.nb-input`, `.nb-btn`. Same IDs, same fields, same script order. Added `autocomplete` and `role="alert"` for accessibility |

`login.js`, `register.js`, `data.js`, `icons.js` are unchanged. `style.css` and `neo.css` are no longer loaded by these two pages; `profile.html` and `admin.html` still use them.

# Announcement recovery, read tracking & confirmations (17 Oct 2026)

Three features, one module, because they all read the same records:

1. **Recovery Center** – a full-screen pop-up that gathers everything a student still has to deal
   with (unread, confirmation pending, recently updated, expired-but-unhandled) into one place with
   filters and a progress tracker.
2. **Read-progress tracker** – a ring plus three meters showing read, confirmation, and handling
   progress, echoed by per-notice chips on the cards.
3. **Confirmation system** – a hexagonal "I have read this" button in the notice details and in every
   Recovery Center row, with an admin-side meter of how many students have confirmed.

## New files
| File | Job |
|---|---|
| `recovery.css` | Recovery Center, tracker ring/meters, hexagon confirmation button, status tags |
| `recovery.js` | All of the above. Loads last on `index.html` only |

## Changed files
| File | What changed |
|---|---|
| `data.js` | Optional `expires`, `requiresAck`, `updatedAt` on announcements. New helpers: `noticeLife`, `expiryText`, `isAcknowledged`, `acknowledgeNotice`, `ackTally`, `ackMapFor`, `studentsForNotice`, `forgetStudent`. A broken `new Date("2026-10-01")` day-shift is avoided with a hand-rolled `parseNoticeDate` |
| `script.js` | "Needs you" nav entry with a count badge; the progress ring gained an "Open" button; notice cards gained expired / expiring / updated flags and Confirm chips; the details pop-up hosts the confirmation control |
| `index.html` | `recovery.css` link, the Recovery Center pop-up (added **before** the details pop-up so details stack on top), an off-screen live region, `recovery.js` last |
| `admin.html`, `admin.js` | Fifth stat box "Awaiting confirmation", a per-notice meter, and the expiry date + "requires confirmation" fields on the notice form |
| `neo.css` | Admin confirmation styles (stat box, meter, flags) |
| `style.css` | `.stats` is now `auto-fit` so the fifth stat box does not wrap on its own |

## Two design decisions worth knowing
- **Confirming also marks the notice read.** An "I have read this" claim is stronger than merely
  opening it, so leaving the notice flagged Unread afterwards would be a lie.
- **Confirmation can never be double-counted.** `acknowledgeNotice` returns `true` only the first time.

## Not done yet
- `profile.html` and `admin.html` still run the older `style.css` + `neo.css`.
- The shape pop-up does not yet show expiry or confirmation tags.
- Only the Recovery Center traps keyboard focus; the other pop-ups do not.


# Admin approval for new accounts

New student accounts now start as **pending**. They cannot log in until an admin approves them.

| File | What changed |
|---|---|
| `data.js` | `registerStudent` saves `status: "pending"`. New `isApproved`, `pendingStudents`, `approveStudent`. `loginStudent` now returns `{ ok, student }` or `{ ok: false, pending: true }`. `getCurrentStudent` ignores unapproved accounts |
| `register.js` | No automatic login. Shows "Registration sent" and waits for approval |
| `login.js` | Pending accounts get a "waiting for admin approval" message |
| `admin.html` | "Waiting for approval" section and a count badge on the Students tab |
| `admin.js` | Approve / Reject buttons. Student totals, course counts and announcement recipients count approved students only. Student tab refreshes when storage changes |

Rejecting deletes the pending record, so the student can register again. Accounts created before this
change have no `status` and are treated as approved, so nobody gets locked out.

# Shape outlines and positions (admin dashboard, student dashboard, Recovery Center)

Only CSS changed. No JavaScript or HTML was touched.

| File | What changed |
|---|---|
| `base.css` | **Triangle and hexagon outlines were invisible.** Their outline was a `drop-shadow` on the same element as the `clip-path`, and CSS clips *after* it filters, so the outline was cut away. They now draw an ink silhouette (`::before`) with the colored face (`::after`) on top, so every shape has the same visible outline. Heavier default outline (`--sh-out` 5px) plus a hard offset shadow (`--sh-pop`) so shapes pop. Added the missing `.shape.xs` size. Outline color is `--line` (falls back to `--ink`); shapes on colored blocks use `--edge` so the outline stays dark in dark mode |
| `home.css` | Hero shapes use the same outline system and sit in a 2x2 grid in their own column, so they no longer run into the headline or the corner tag. Headline size follows the hero's width (`cqw`). Tiny shapes (calculator buttons, bottom strip) get a lighter outline. New styles for the Recovery Center panel: head, filter chips, rows, and the "why" tags, each with an aligned, outlined shape |
| `admin.css` | Category badges show their shape at the right size on the text baseline (white face). Stat-box and chart shapes get room for the offset shadow, and a lighter outline on the chart so tiny shapes keep a visible face |

Tune the look in one place: `--sh-out` (outline weight) and `--sh-pop` (offset shadow) in `base.css`.

# Cloud sync: registrations now reach the admin (GitHub Pages)

Cause: all data lived in each browser's `localStorage`, so a student's registration never left their device.
Fix: `cloud.js` mirrors the shared data to a Firebase Realtime Database. Setup is in `CLOUD-SETUP.md`.

| File | What changed |
|---|---|
| `cloud.js` (new) | Copies changes up and down. Uploads only the records that changed, so two devices cannot overwrite each other's students. Downloads fresh data when a page opens, and every 8 seconds |
| `cloud-config.js` (new) | The one setting: `databaseURL`. Empty = sync off |
| `data.js` | `registerStudent`, `loginStudent` and `approveStudent` refresh from the shared database first (catches duplicate IDs across devices, and approvals made a moment ago) |
| `admin.js` | Redraws dashboard, students and questions when new data arrives from another device |
| `index / login / register / profile / admin .html` | Load `cloud-config.js` and `cloud.js` right after `icons.js` |
