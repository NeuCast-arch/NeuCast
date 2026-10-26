# NeuCast

A web-based notification system prototype for New Era University. Students see university-wide
announcements plus the ones for their own course; administrators post and manage them.

Open `index.html` through any static server (or GitHub Pages). Everything is saved in the browser and,
if `cloud-config.js` has a database URL, mirrored to Firebase (see `CLOUD-SETUP.md`).

## Test admin account
- Email: `admin@neucast.test`
- Password: `admin123`
(For local testing only. Students create their own accounts on `register.html`.)

## Files
| File | Job |
|---|---|
| `tokens.css` | Every color, radius, space and type value (light + dark). Re-theme here only |
| `base.css` | Reset, type, focus ring, icons, the flat shapes |
| `skeleton.css` | Skeleton loaders and the busy-button spinner |
| `components.css` | Buttons, chips, tags, inputs, panels, pop-ups, toasts, banners, empty states |
| `home.css`, `auth.css`, `admin.css` | Page layout only |
| `feature.css` | Shared layout for the four shape-function pages below (intro banner, filter grid) |
| `archive.css`, `feedback.css`, `careers.css`, `safety.css` | Layout for just that one shape-function page |
| `animations.css`, `animations.js` | Button, card/section, geometric, loading, and transition animations |
| `theme.js` | Sets light / dark and text size before the page paints |
| `ui.js` | Pop-up manager (focus trap, Escape), toasts, confirm dialog, skeleton helper, password show/hide, inline form errors |
| `boot.js` | Paints the page (with skeletons) first, then loads the page's scripts in order |
| `icons.js`, `data.js`, `cloud.js`, `cloud-config.js` | Unchanged roles (icons added; `data.js` also holds feedback/saved/applied storage) |
| `script.js`, `calendar.js`, `calc.js` | Homepage behavior (calc.js = geometry calculator) |
| `login.js`, `register.js`, `profile.js`, `admin.js` | Behavior of those pages |
| `feature-nav.js` | Shared by the four shape-function pages: who is viewing, header user link, phone menu |
| `archive.js` | Archive page (Rectangle): filter past/expired/read notices by date and scope |
| `feedback.js` | Feedback page (Pentagon): star rating, suggestions, bug reports |
| `careers.js` | Careers & OJT page (Trapezoid): listings, Apply now / Save opportunity |
| `safety.js` | Health & Safety page (Parallelogram): hazard/closure/health bulletins |

Script order matters and is set in the one `<script src="boot.js" data-scripts="...">` tag at the end of each page.

## Four shape-function pages
On top of the Calm Geometry homepage, NeuCast has one page per "shape module": `archive.html` (Rectangle),
`feedback.html` (Pentagon), `careers.html` (Trapezoid), `safety.html` (Parallelogram). They are linked from the
main nav on every signed-in page. Careers & Safety are just two new announcement categories (`careers`,
`safety` in `CATEGORIES`, `data.js`) with their own filtered view, so the admin posts them the same way as any
other announcement, from the usual **New announcement** form (pick the category; Careers listings can also take
an optional "Apply" link). Feedback is separate data (ratings, suggestions, bug reports), reviewed from the
admin dashboard's **Feedback** tab.
