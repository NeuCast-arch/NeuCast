# Phone push with OneSignal (free plan): alerts even when NeuCast is closed

Without this, NeuCast alerts only reach a page that is open. With it, a new announcement buzzes the student's
phone like any other app. Off until you paste an App ID (step 3), so nothing breaks if you skip it.

## Setup (about 10 minutes, one time)
1. Go to <https://onesignal.com>, sign up free, then **New App/Website**. Name it `NeuCast`, choose **Web**.
2. Choose the **Typical Site** setup. For **Site URL** enter your GitHub Pages address exactly as people open it
   (for example `https://yourname.github.io/neucast/`). Turn **Auto Resubscribe** on. Leave local testing off.
   Skip the "upload the service worker" step: `OneSignalSDKWorker.js` is already in this project.
3. Copy the **App ID** and paste it into `cloud-config.js`:

       window.NEUCAST_PUSH = { oneSignalAppId: "your-app-id-here" };

4. In OneSignal open **Settings > Keys & IDs** and copy the **REST API Key**. Do **not** put it in any file.
   Open the **admin dashboard > Phone push**, paste it, **Save key**, then **Send test push**.
5. Commit and push to GitHub, wait for Pages to redeploy, hard-refresh.

## Students on iPhone (iOS 16.4 or newer)
Apple only allows push for a site added to the Home Screen.
1. Open the site in **Safari**.
2. Tap **Share > Add to Home Screen**.
3. Open **NeuCast from the Home Screen icon** (not from Safari), log in.
4. Tap the sliders icon (Settings) > **Alerts > System notifications** and tap **Allow**.
5. Tap **Send a test alert** to check.
Android and desktop students skip steps 1 to 3: the "Turn on alerts" banner is enough.

## How accounts get linked (automatic)
- **Every page load**, a logged-in student's phone is linked to their student ID and tagged with their course.
  No code or tap is needed, so any new account is linked the first time it opens NeuCast.
- **The one step that can't be automatic:** the browser itself requires the student to tap **Allow**. NeuCast
  shows the "Turn on alerts" banner on the homepage to every student who hasn't, and asks again every 3 days if
  they pick "Not now".
- If that browser already allowed alerts (for example a second account on the same phone), push switches on
  silently for the new account.
- **Logging out detaches the phone from the account but keeps it subscribed.** It still gets announcements for all students, and never the last student's course-only ones.
- Turning "System notifications" off in Settings really stops push on that device.
- A student who changes course gets the new course tag the next time they open the homepage.

## Without opening the app, or with the phone off
- After a student has logged in once and tapped **Allow**, nothing else is needed. Pushes arrive with NeuCast closed.
- A phone that is **switched off or has no internet** cannot be alerted at that moment. Apple's and Google's servers
  hold the push and deliver it when the phone is back online: up to 7 days for normal notices, 3 days for Urgent and
  Health ones, so an old typhoon warning doesn't show up a week late.
- An iPhone that was off may show only the **latest** of several missed pushes. The "While you were away" summary
  in NeuCast lists everything missed once the student opens it.
- Phone settings can still delay or block alerts: Focus / Do Not Disturb, Low Power Mode, Android battery saver, or
  notifications turned off for the browser or Home Screen app in the phone's own Settings.
- The push is sent from the admin's browser when the admin posts, so the admin needs internet at that moment.

## What gets sent
- A **new** announcement is pushed when the admin posts it: to all students, or only to the course it targets.
  Urgent and Health notices are sent as high priority. Edits show as in-app alerts only, so a typo fix does not buzz every phone.
- Tapping the push opens that announcement.

## Know before the demo
- **Not tested against a live OneSignal account from here.** Do step 4's test push before presenting.
- If **Send test push** says it couldn't reach OneSignal, the browser blocked the call. Send from the OneSignal
  dashboard (**Messages > New Push**) instead; student phones receive it the same way.
- The REST key sits in the admin browser's storage. Use only your own device, press **Remove key** afterwards,
  and rotate the key in OneSignal after the demo. A real launch would send from a server.
- Check OneSignal's current free-plan limits on their pricing page.
