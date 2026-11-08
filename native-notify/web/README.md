# Agent Notify — notification bell + inbox (web)

_Added by Agent Notify (add-on: Notification bell + inbox (web), v1, base stack: Other — any framework (REST) — best guess: Static HTML + vanilla JavaScript (web site, no framework))._

This pull request adds the web bell + inbox widget: a bell button with an
unread badge and an inbox panel (list, read/unread, delete, deep links) that
talks to the universal inbox API. It is additive — nothing existing is
modified.

> **Public values only.** `native-notify/web/nativeNotifyIds.js` holds your app id and the PUBLISHABLE web key — both safe to commit and in page source. Never put your app **token** (the key that can send) in website code.

## What is in this PR

- `native-notify/web/native-notify-bell.js` — plain-JS ES module (no dependencies, no build step).
- `native-notify/web/NativeNotifyBell.jsx` — React / Next.js component + the `useNativeNotifyInbox` headless hook.
- `native-notify/web/nativeNotifyBell.css` — styles and theming (one stylesheet for both entry points).
- This guide.

## How it reads the inbox

The widget is a thin client of the **universal inbox API** — a per-device
inbox. A device only ever sees its own entries:

| Call | Endpoint |
| --- | --- |
| List | `GET /api/universal/inbox/:appId/:appToken?deviceId=&take=&skip=` (200; `take` 1..200, default 50) |
| Unread count | `GET /api/universal/inbox/:appId/:appToken/unread-count?deviceId=` |
| Mark one read | `POST /api/universal/inbox/read` `{ appId, appToken, deviceId, entryId }` |
| Mark all read | `POST /api/universal/inbox/read-all` `{ appId, appToken, deviceId }` |
| Delete one | `POST /api/universal/inbox/delete` `{ appId, appToken, deviceId, entryId }` (soft, idempotent) |
| Clear | `POST /api/universal/inbox/clear` `{ appId, appToken, deviceId }` (soft, idempotent) |

`deviceId` is the stable key universal registration stored the device under —
for a browser, that is the id the Connect Web Push snippet (sw.js + subscribe)
registered the PushSubscription under, stored in `localStorage` as
`nn_web_device_id`. This widget defaults to the SAME key, so the bell shows
exactly the pushes this browser receives. The site can instead:

- **show the same inbox as the app** — pass the device id your backend knows
  for the logged-in user (`deviceId` or `getDeviceId`); or
- **keep its own per-browser key** (the default, persisted in `localStorage`).

### Per-user inbox (logged-in accounts)

A site with accounts gets a per-user inbox by registering each browser under
the user's own id: pass `subscriberId` (your user id) wherever the browser
registers — the Connect Web Push snippet and `useNativeNotifyWebPush` both
take it — and keep it in step as people sign in and out. Every send addressed
to that subscriber then reaches their registered browsers, and this bell shows
the browser's own copy of those entries (list, read/unread, delete).

- Show the bell only for signed-in users: render it from your auth state and
  hide it on the sign-in screen. A common place is the site header next to the
  account/avatar icon.
- On a shared browser, clear what the person should not leave behind when they
  sign out: `POST /api/universal/inbox/clear` `{ appId, appToken, deviceId }`
  (soft, idempotent). The device re-registers with the next user's id at their
  next sign-in.

Read state is per entry on the server (`read_at`): opening the panel does NOT
mark everything read — a row is marked read when it is opened, and "Mark all
read" is an explicit action. The unread badge polls (default every 30s, paused
while the tab is hidden); the API has no SSE channel.

## Wire it up

### React / Next.js

`NativeNotifyBell.jsx` is a client component (`"use client"`), so a Next.js App
Router layout or page can render it directly. Only `appId` and a credential
are required — prefer `webKey` (the app's PUBLISHABLE WEB KEY, safe in page
source: it can read/mark only this browser's own inbox); `appToken` keeps
working for sites that already embed one — and the file carries JSDoc types,
so a TypeScript project (`allowJs` + `strict`) type-checks this mount as
written:

```tsx
// Use your project's import alias (e.g. "@/…" from tsconfig "paths") or a
// path relative to THIS file — "./native-notify/…" only works from the root.
import NativeNotifyBell from "@/native-notify/web/NativeNotifyBell";
import "@/native-notify/web/nativeNotifyBell.css";
import { NN_APP_ID, NN_WEB_KEY } from "@/native-notify/web/nativeNotifyIds";

// App id + publishable web key: written to native-notify/web/nativeNotifyIds.js by Agent Notify —
// public values, nothing to set in your host.
export function SiteHeader() {
  return (
    <header>
      {/* the rest of your header */}
      <NativeNotifyBell
        appId={NN_APP_ID}
        webKey={NN_WEB_KEY}
        title="Notifications"
        theme={{ accent: "#2563eb" }}
      />
    </header>
  );
}
```

- **Stylesheet:** with the App Router, import `nativeNotifyBell.css` from the
  component that renders the bell or from `app/layout.tsx`. With the **Pages
  Router**, global CSS may only be imported from `pages/_app` — import it
  there, or `next build` fails.
- **Props:** use exactly the prop names in the Options table below (they match
  the `NativeNotifyBellProps` JSDoc type in the file).

For a custom UI, use the headless hook instead:

```jsx
import { useNativeNotifyInbox } from "@/native-notify/web/NativeNotifyBell";

const inbox = useNativeNotifyInbox({ appId, webKey, take: 20 });
// inbox.entries, inbox.unreadCount, inbox.loading, inbox.error,
// inbox.refresh, inbox.markRead, inbox.markAllRead, inbox.remove,
// inbox.clearInbox, inbox.loadMore
```

The unread count loads as soon as the hook mounts (and then polls); the list
loads when you call `inbox.refresh()` — e.g. when your panel opens.

### Plain JS (any site, no build step)

```html
<link rel="stylesheet" href="/native-notify/web/nativeNotifyBell.css" />
<script type="module">
  import { mountNativeNotifyBell } from "/native-notify/web/native-notify-bell.js";
  import { NN_APP_ID, NN_WEB_KEY } from "/native-notify/web/nativeNotifyIds.js";

  mountNativeNotifyBell({
    appId: NN_APP_ID,      // public values, written to native-notify/web/nativeNotifyIds.js by Agent Notify
    webKey: NN_WEB_KEY,    // the publishable web key — safe in page source
    title: "Notifications",
    position: "bottom-right",
  });
</script>
```

```js
// If your backend knows the user's registered device id, pass it in:
mountNativeNotifyBell({
  appId: NN_APP_ID,
  webKey: NN_WEB_KEY,
  getDeviceId: async () => (await fetch("/api/me/device-id").then((r) => r.json())).deviceId,
});
```

### Options

| Option | Default | What it does |
| --- | --- | --- |
| `appId` / `appToken` | — | Required. Read from your config; never committed. |
| `deviceId` / `getDeviceId` | per-browser key | Whose inbox to show. Pass the app's device id to share one inbox. |
| `take` | 20 | Rows per page (max 200). |
| `title` | "Notifications" | Panel header. |
| `emptyText` | "You are all caught up." | Empty state. |
| `showCount` | true | Numeric badge; `false` shows a plain dot. |
| `maxCount` | 99 | Badge cap ("99+"). |
| `allowDelete` | true | Show the per-row delete button. |
| `pollMs` | 30000 | Unread poll interval; `0` disables polling. |
| `theme` | light/dark defaults | Color override — see Themes. |
| `position` | "bottom-right" | Floating corner, or `mount` into your own header. |
| `onNotificationPress` | — | Called on every row click (before navigation). |
| `onNavigate` | — | Handle the deep link yourself; otherwise `pushData.url` opens. |
| `onUnreadChange` | — | Called with the unread count on every change. |

### Themes

Pass a subset of these keys — the widget sets the matching CSS custom
properties (`--nn-accent`, `--nn-surface`, `--nn-card`, `--nn-border`,
`--nn-title`, `--nn-text`, `--nn-muted`, `--nn-dot`, `--nn-badge-text`,
`--nn-delete`, `--nn-radius`) — or set them in your own CSS:

```js
theme: { accent: "#2563eb", dot: "#ef4444", radius: "14px", background: "#ffffff" }
```

### Deep links

Put a `url` inside the notification's `pushData` and the row opens it on
click (same-origin paths and http(s) URLs only):

```json
{ "title": "New service times", "message": "…", "pushData": { "url": "/news/service-times" } }
```

### Accessibility

- The bell is a real `<button>` with an `aria-label` that includes the unread
  count, `aria-haspopup="dialog"` and `aria-expanded`.
- The panel is `role="dialog"` (non-modal) labelled by its title; Escape and
  click-outside close it and focus returns to the bell.
- The unread count is announced through a polite live region; rows are buttons
  with readable labels; the only icon is decorative (`aria-hidden`).
- Respects `prefers-color-scheme` and `prefers-reduced-motion`.

## Checklist

- [x] `appId` / `webKey` are in `native-notify/web/nativeNotifyIds.js` — public values (the web key is the PUBLISHABLE key: it can register this browser and read its own inbox, never send). Nothing to set in your host.
- [ ] Decide the `deviceId`: the per-browser default (matched to the Connect Web Push snippet's `nn_web_device_id`), or the device id your app registered
- [ ] Import `nativeNotifyBell.css` (or copy its variables into your stylesheet)
- [ ] Mount the bell (React component or `mountNativeNotifyBell`) — or ask Agent Notify to do it: it reads your file, makes the exact edit, and opens a PR
- [ ] Turn web push on — ask Agent Notify for the web-push add-on (service worker + "Enable notifications" button), or use the **Connect Web Push (browsers)** step of **Setup & docs → Push notifications setup** in [Native Notify](https://dashboard.nativenotify.com) — the widget shows the inbox, web push is what makes the browser receive the pushes
- [ ] Send a test notification with `pushData.url` and click the row
- [ ] Run the accessibility pass (keyboard, screen reader, reduced motion)
