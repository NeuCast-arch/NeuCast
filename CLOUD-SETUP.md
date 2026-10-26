# Making registrations reach the admin (GitHub Pages)

## Why approvals never arrived
NeuCast saved everything in the browser's `localStorage`, and every browser has its own copy.
A student registering on their phone saved the account on **that phone only**. The admin's browser
never saw it, so there was nothing to approve. Running it on one computer worked, which is why
this only showed up after publishing.

GitHub Pages can only host files. It cannot store data. So the data needs a small shared database.
This project now syncs to a free **Firebase Realtime Database** (no server of your own, no SDK).

## Setup (about 5 minutes, one time)
1. Go to <https://console.firebase.google.com> and sign in with a Google account.
2. **Add project**, name it (for example `neucast`), and skip Google Analytics.
3. In the left menu: **Build > Realtime Database > Create database**. Pick a location, then
   choose **Start in test mode**.
4. Copy the database URL shown at the top of the Data tab. It looks like
   `https://neucast-default-rtdb.firebaseio.com` (or `...firebasedatabase.app`).
5. Open the **Rules** tab and replace the rules with the following, then **Publish**.
   (Test mode rules expire after 30 days. These do not.)

       {
         "rules": {
           "neucast": { ".read": true, ".write": true }
         }
       }

6. Open `cloud-config.js` in this project and paste the URL between the quotes:

       databaseURL: "https://neucast-default-rtdb.firebaseio.com"

7. Commit and push to GitHub. Wait for Pages to redeploy, then hard-refresh (Ctrl+Shift+R).

## How to check it works
Open the site on two different devices (or one normal window and one private window).
Register a student in one, then open **Admin > Students** in the other. The request appears within
about 8 seconds without refreshing. Approve it, and the student can log in.
You can also watch the data appear under `neucast` in the Firebase console.

## Good to know
- **First time:** whatever each browser already had is merged up into the database, so existing
  test data is not lost.
- **Shared:** students, approvals, announcements, questions, confirmations, read records.
  **Not shared:** who is logged in on a device, and theme/text-size settings.
- **Not secure, prototype only.** Anyone who knows the database URL can read and change the data,
  and passwords are stored as plain text (as they were before). Use made-up passwords when
  demoing. A real launch needs Firebase Authentication and password hashing.
- Leaving `databaseURL` empty switches the sync off and the site works as before (per browser).
- Two admins editing the same announcement at the same moment: the last save wins.
