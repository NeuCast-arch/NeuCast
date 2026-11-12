# NeuCast alerts (all free, no server)

## What a student gets
| Layer | When it works | Cost |
|---|---|---|
| Pop-up with a **Read** button | NeuCast is open in any tab | Free |
| Chime + longer pop-up for **Urgent / Health** | Same, sound can be switched off | Free |
| `(2) NeuCast` in the tab title | Tab is in the background | Free |
| **System notification** (phone or computer), tap opens the announcement | NeuCast is open somewhere, even behind other windows. Student taps **Turn on alerts** once | Free |
| **Catch-up summary** ("While you were away: 3 new...") | Student opens NeuCast after being away | Free |

New posts reach an open page in about a second: `cloud.js` listens to Firebase's free live stream (Server-Sent
Events) and still polls every 8 seconds as a backup. Edits to an announcement alert again as "Updated".
Only announcements for the student's own course (or all students) alert, expired ones do not, and ones already
read on another device do not.

## Files
- `notify.js` the engine (loaded on the homepage and the four feature pages)
- `notify.css` the prompt and the toast Read button
- `sw.js` service worker, needed so phones will show a system notification and so a tap opens the announcement
- Small edits: `cloud.js` (live stream), `ui.js` (toast action button), `index.html` (prompt + Settings > Alerts), `data.js` (one FAQ line)

## How to demo it
1. Student logs in on a phone or second browser, opens **Settings > Alerts**, taps **Send a test alert**.
2. Switch to another tab. Post an **Urgent** announcement as admin. The student device chimes, shows the pop-up
   and the system notification.
3. Close NeuCast on the student device, post again, reopen: the catch-up summary appears.

## Limits to tell your panel honestly
- **A fully closed browser cannot be notified** without a push server. Free options that add this: OneSignal free web push,
  or Firebase Cloud Messaging with a small sender (needs a paid Firebase plan for Cloud Functions).
- **iPhone Safari** has no system notifications in a normal tab; pop-ups inside NeuCast still work.
- Needs **https** (GitHub Pages is) or localhost. Opening `index.html` as a file shows pop-ups only.
- Firebase free plan allows about **100 devices connected live at once**; beyond that the 8-second polling still delivers.
- Alert preferences are saved per device, not in the cloud.
