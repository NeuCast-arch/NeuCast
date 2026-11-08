/**
 * Native Notify — notification bell + inbox for React and Next.js.
 *
 * Added by Agent Notify. Self-contained: the only import is React. Two exports:
 *
 *   useNativeNotifyInbox(options)  — the headless hook (data + actions) for a
 *                                    custom UI.
 *   <NativeNotifyBell … />         — the drop-in bell + panel, same behavior
 *                                    and class names as the vanilla module
 *                                    (native-notify-bell.js), so it shares
 *                                    nativeNotifyBell.css.
 *
 * Next.js App Router: this file's "use client" directive makes it a client
 * component — import it from a server page or layout and render it normally.
 *
 * TypeScript: the JSDoc types below are what a TypeScript project sees. Only
 * appId and a credential are required — every other prop is optional (prefer
 * webKey: the app's PUBLISHABLE WEB KEY, safe in page source) — so
 * <NativeNotifyBell appId={process.env.NEXT_PUBLIC_NN_APP_ID}
 * webKey={process.env.NEXT_PUBLIC_NN_WEB_KEY} /> type-checks as is.
 *
 * Values come from your site's own configuration — never hardcode them here:
 *   NN_APP_ID / NN_WEB_KEY   (NEXT_PUBLIC_NN_APP_ID / NEXT_PUBLIC_NN_WEB_KEY
 *   in a Next.js app). See native-notify/web/README.md.
 */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_API_BASE = "https://app.nativenotify.com";
const DEFAULT_STORAGE_KEY = "nn_web_device_id";

/**
 * One inbox row, as the universal inbox API returns it.
 * @typedef {Object} NativeNotifyInboxEntry
 * @property {number} entryId
 * @property {string | null} [title]
 * @property {string | null} [body]
 * @property {Record<string, unknown> | null} [data] The push's pushData — `data.url` is the deep link.
 * @property {string | null} [sentAt] ISO timestamp.
 * @property {string | null} [readAt] ISO timestamp, null while unread.
 * @property {boolean} [read]
 */

/**
 * Color overrides — each key sets the matching --nn-* CSS custom property.
 * @typedef {Object} NativeNotifyTheme
 * @property {string} [accent]
 * @property {string} [background]
 * @property {string} [card]
 * @property {string} [border]
 * @property {string} [title]
 * @property {string} [text]
 * @property {string} [mutedText]
 * @property {string} [dot]
 * @property {string} [badgeText]
 * @property {string} [delete]
 * @property {string} [radius]
 */

/** @typedef {"bottom-right" | "bottom-left" | "top-right" | "top-left"} NativeNotifyBellPosition */

/**
 * The credential the web helpers accept: webKey (preferred — safe in page
 * source) or appToken (kept working for existing sites). One of the two is
 * required; the type says the same as the runtime (`webKey || appToken`).
 * @typedef {{ webKey: string | null | undefined, appToken?: string | null | undefined } | { appToken: string | null | undefined, webKey?: string | null | undefined }} NativeNotifyWebCredential
 */

/**
 * Options for useNativeNotifyInbox. Only appId and a credential are required — prefer webKey.
 * @typedef {Object} NativeNotifyInboxOptionsBase
 * @property {string | number | null | undefined} appId Your Native Notify app id (from config).
 * @property {string | null | undefined} [webKey] Your PUBLISHABLE WEB KEY (from config) — safe in page source.
 * @property {string | null | undefined} [appToken] Your Native Notify app token — kept working for existing sites.
 * @property {string | null | undefined} [deviceId] Whose inbox to show (default: this browser's id).
 * @property {string | undefined} [storageKey] localStorage key for the per-browser id.
 * @property {string | undefined} [apiBase] Defaults to https://app.nativenotify.com.
 * @property {number | undefined} [take] Rows per page (default 20).
 * @property {number | undefined} [pollMs] Unread poll interval (default 30000; 0 disables).
 * @property {typeof fetch | undefined} [fetch] Custom fetch (tests, proxies).
 */

/** @typedef {NativeNotifyInboxOptionsBase & NativeNotifyWebCredential} NativeNotifyInboxOptions */

/**
 * What useNativeNotifyInbox returns.
 * @typedef {Object} NativeNotifyInbox
 * @property {string | null} deviceId
 * @property {NativeNotifyInboxEntry[]} entries
 * @property {number} total
 * @property {number} unreadCount
 * @property {boolean} loading
 * @property {string | null} error
 * @property {() => Promise<void>} refresh
 * @property {() => Promise<void>} refreshUnread
 * @property {(entry: NativeNotifyInboxEntry) => Promise<void>} markRead
 * @property {() => Promise<void>} markAllRead
 * @property {(entry: NativeNotifyInboxEntry) => Promise<void>} remove
 * @property {() => Promise<void>} clearInbox
 * @property {() => Promise<void>} loadMore
 */

/**
 * Props for <NativeNotifyBell />. Only appId and a credential are required — prefer webKey.
 * @typedef {Object} NativeNotifyBellPropsBase
 * @property {string | number | null | undefined} appId Your Native Notify app id (e.g. process.env.NEXT_PUBLIC_NN_APP_ID).
 * @property {string | null | undefined} [webKey] Your PUBLISHABLE WEB KEY (e.g. process.env.NEXT_PUBLIC_NN_WEB_KEY) — safe in page source.
 * @property {string | null | undefined} [appToken] Your Native Notify app token — kept working for existing sites; do not put it in page source.
 * @property {string | null | undefined} [deviceId] Whose inbox to show (default: this browser's id).
 * @property {string | undefined} [storageKey] localStorage key for the per-browser id.
 * @property {string | undefined} [apiBase] Defaults to https://app.nativenotify.com.
 * @property {number | undefined} [take] Rows per page (default 20).
 * @property {string | undefined} [title] Panel header (default "Notifications").
 * @property {string | undefined} [emptyText] Empty-state text.
 * @property {boolean | undefined} [showCount] Numeric badge (default true; false = plain dot).
 * @property {number | undefined} [maxCount] Badge cap (default 99 → "99+").
 * @property {boolean | undefined} [allowDelete] Per-row delete button (default true).
 * @property {number | undefined} [pollMs] Unread poll interval (default 30000; 0 disables).
 * @property {NativeNotifyTheme | undefined} [theme] Color overrides.
 * @property {NativeNotifyBellPosition | undefined} [position] Floating corner (default "bottom-right").
 * @property {((entry: NativeNotifyInboxEntry) => void) | undefined} [onNotificationPress] Called on every row click.
 * @property {((url: string, entry: NativeNotifyInboxEntry) => void) | undefined} [onNavigate] Handle the deep link yourself.
 * @property {((count: number) => void) | undefined} [onUnreadChange] Called with the unread count on every change.
 * @property {string | undefined} [className] Extra class on the root element.
 */

/** @typedef {NativeNotifyBellPropsBase & NativeNotifyWebCredential} NativeNotifyBellProps */

/** An API failure: the service's { error: { code, message } } envelope, never a stack trace. */
class NativeNotifyRequestError extends Error {
  /**
   * @param {string} message
   * @param {number} status
   * @param {string | null} code
   */
  constructor(message, status, code) {
    super(message);
    this.name = "NativeNotifyRequestError";
    /** @type {number} */
    this.status = status;
    /** @type {string | null} */
    this.code = code;
  }
}

/**
 * @param {unknown} err
 * @param {string} fallback
 * @returns {string}
 */
function errorText(err, fallback) {
  return err instanceof Error && err.message ? err.message : fallback;
}

/**
 * A browser that has not registered yet: the web key can read only its own
 * REGISTERED device's inbox, so the hook treats this state as an empty inbox
 * — the raw API message ("register this browser with the web key first.") is
 * developer copy, never something a visitor should read (2026-10-02).
 * @param {unknown} err
 * @returns {boolean}
 */
function isUnregisteredDeviceError(err) {
  const code = err ? /** @type {any} */ (err).code : null;
  return code === "web_key_scope";
}

/** @type {{ __nnFallbackDeviceKey?: string }} */
const nnGlobal = /** @type {any} */ (globalThis);

function randomKey() {
  return "nn-" + Math.random().toString(36).slice(2, 10) + "-" + Date.now().toString(36);
}

/**
 * A stable per-browser device id, persisted in localStorage — the same 'nn_web_device_id' key the Connect Web Push snippet registers under, so the bell and this browser's pushes share one inbox.
 * @param {string} [storageKey]
 * @returns {string}
 */
export function getStableDeviceKey(storageKey) {
  const key = storageKey || DEFAULT_STORAGE_KEY;
  try {
    const existing = window.localStorage.getItem(key);
    if (existing) return existing;
    const fresh = randomKey();
    window.localStorage.setItem(key, fresh);
    return fresh;
  } catch (err) {
    if (!nnGlobal.__nnFallbackDeviceKey) nnGlobal.__nnFallbackDeviceKey = randomKey();
    return nnGlobal.__nnFallbackDeviceKey;
  }
}

/**
 * Time formatting for inbox rows (falls back to the raw value).
 * @param {string | number | Date | null | undefined} value
 * @returns {string}
 */
export function timeAgo(value) {
  if (value === null || value === undefined) return "";
  const at = new Date(value).getTime();
  if (Number.isNaN(at)) return typeof value === "string" ? value : "";
  const minutes = Math.round((Date.now() - at) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return minutes + " min ago";
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours + (hours === 1 ? " hour ago" : " hours ago");
  const days = Math.round(hours / 24);
  if (days < 7) return days + (days === 1 ? " day ago" : " days ago");
  return new Date(value).toLocaleDateString();
}

/**
 * The deep-link convention: pushData.url (also accepts pushData.deepLink).
 * @param {NativeNotifyInboxEntry | null | undefined} entry
 * @returns {string | null}
 */
export function entryUrl(entry) {
  const data = entry && entry.data;
  if (!data || typeof data !== "object") return null;
  const url = data["url"];
  const deepLink = data["deepLink"];
  const raw = typeof url === "string" ? url : typeof deepLink === "string" ? deepLink : null;
  return raw && raw.trim() ? raw.trim() : null;
}

/**
 * Same-origin paths and http(s) URLs only — never javascript:/data: payloads.
 * @param {unknown} url
 * @returns {boolean}
 */
export function isSafeUrl(url) {
  if (typeof url !== "string" || !url.trim()) return false;
  if (url.charAt(0) === "/" && url.charAt(1) !== "/") return true;
  try {
    const parsed = new URL(url, window.location.href);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch (err) {
    return false;
  }
}

/**
 * The headless hook: inbox data + actions for a custom UI. Mirrors the data
 * the API returns — read is per entry (server-side read_at), so opening the
 * panel does not mark anything read.
 * @param {NativeNotifyInboxOptions} options
 * @returns {NativeNotifyInbox}
 */
export function useNativeNotifyInbox(options) {
  const {
    appId,
    webKey,
    appToken,
    deviceId: deviceIdOption,
    storageKey,
    apiBase,
    take = 20,
    pollMs = 30000,
    fetch: fetchOption,
  } = options || {};

  // 2026-09-29: prefer the publishable web key; appToken keeps working. The
  // credential rides the same appToken field/URL segment on the wire.
  const credential = webKey || appToken;

  const [deviceId, setDeviceId] = useState(/** @type {string | null} */ (deviceIdOption ? String(deviceIdOption) : null));
  const [entries, setEntries] = useState(/** @type {NativeNotifyInboxEntry[]} */ ([]));
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(/** @type {string | null} */ (null));
  // Stable identity: a fresh wrapper on every render would re-create request,
  // every action callback and the polling effect (resetting its interval).
  const doFetch = useMemo(
    () => /** @type {typeof fetch} */ (fetchOption || ((input, init) => window.fetch(input, init))),
    [fetchOption]
  );

  // Resolve the default per-browser device id once (client-side only).
  useEffect(() => {
    if (deviceId) return;
    setDeviceId(getStableDeviceKey(storageKey));
  }, [deviceId, storageKey]);

  const base = String(apiBase || DEFAULT_API_BASE).replace(/\/+$/, "");

  const request = useCallback(
    /**
     * @param {string} path
     * @param {RequestInit} [init]
     * @returns {Promise<any>}
     */
    async (path, init) => {
      const res = await doFetch(base + path, init);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail = json && json.error ? json.error : {};
        throw new NativeNotifyRequestError(
          detail.message || "Native Notify request failed (HTTP " + res.status + ").",
          res.status,
          detail.code || null
        );
      }
      return json;
    },
    [base, doFetch]
  );

  const post = useCallback(
    /**
     * @param {string} action
     * @param {Record<string, unknown> | null} body
     */
    async (action, body) => {
      if (!deviceId) return null;
      return request("/api/universal/inbox/" + action, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId, appToken: credential, deviceId, ...(body || {}) }),
      });
    },
    [appId, credential, deviceId, request]
  );

  const listPath = useCallback(
    /** @param {number} skip */
    (skip) =>
      "/api/universal/inbox/" +
      encodeURIComponent(String(appId)) +
      "/" +
      encodeURIComponent(String(credential)) +
      "?deviceId=" +
      encodeURIComponent(String(deviceId)) +
      "&take=" +
      take +
      "&skip=" +
      skip,
    [appId, credential, deviceId, take]
  );

  const refresh = useCallback(async () => {
    if (!deviceId) return;
    setLoading(true);
    try {
      const page = await request(listPath(0));
      setEntries((page && page.entries) || []);
      setTotal(Number(page && page.total) || 0);
      setUnreadCount(Number(page && page.unread) || 0);
      setError(null);
    } catch (err) {
      if (isUnregisteredDeviceError(err)) {
        // Not registered yet → an empty inbox, not an error (2026-10-02).
        setEntries([]);
        setTotal(0);
        setUnreadCount(0);
        setError(null);
      } else {
        setError(errorText(err, "Could not load notifications."));
      }
    } finally {
      setLoading(false);
    }
  }, [deviceId, listPath, request]);

  const refreshUnread = useCallback(async () => {
    if (!deviceId) return;
    try {
      const res = await request(
        "/api/universal/inbox/" +
          encodeURIComponent(String(appId)) +
          "/" +
          encodeURIComponent(String(credential)) +
          "/unread-count?deviceId=" +
          encodeURIComponent(deviceId)
      );
      setUnreadCount(Number(res && res.unread) || 0);
      setError(null);
    } catch (err) {
      if (isUnregisteredDeviceError(err)) {
        setUnreadCount(0);
        setError(null);
      } else {
        setError(errorText(err, "Could not load notifications."));
      }
    }
  }, [appId, credential, deviceId, request]);

  const markRead = useCallback(
    /** @param {NativeNotifyInboxEntry} entry */
    async (entry) => {
      if (!entry || entry.read) return;
      setEntries((rows) => rows.map((row) => (row.entryId === entry.entryId ? { ...row, read: true } : row)));
      setUnreadCount((count) => Math.max(0, count - 1));
      try {
        await post("read", { entryId: entry.entryId });
      } catch (err) {
        setError(errorText(err, "Could not mark the notification read."));
        refresh();
      }
    },
    [post, refresh]
  );

  const markAllRead = useCallback(async () => {
    setEntries((rows) => rows.map((row) => ({ ...row, read: true })));
    setUnreadCount(0);
    try {
      await post("read-all", null);
    } catch (err) {
      setError(errorText(err, "Could not mark the notifications read."));
      refresh();
    }
  }, [post, refresh]);

  const remove = useCallback(
    /** @param {NativeNotifyInboxEntry} entry */
    async (entry) => {
      setEntries((rows) => rows.filter((row) => row.entryId !== entry.entryId));
      setTotal((count) => Math.max(0, count - 1));
      if (!entry.read) setUnreadCount((count) => Math.max(0, count - 1));
      try {
        await post("delete", { entryId: entry.entryId });
      } catch (err) {
        setError(errorText(err, "Could not delete the notification."));
        refresh();
      }
    },
    [post, refresh]
  );

  const clearInbox = useCallback(async () => {
    setEntries([]);
    setTotal(0);
    setUnreadCount(0);
    try {
      await post("clear", null);
    } catch (err) {
      setError(errorText(err, "Could not clear the inbox."));
      refresh();
    }
  }, [post, refresh]);

  const loadMore = useCallback(async () => {
    if (!deviceId) return;
    try {
      const page = await request(listPath(entries.length));
      setEntries((rows) => rows.concat((page && page.entries) || []));
      setTotal(Number(page && page.total) || 0);
      setError(null);
    } catch (err) {
      if (isUnregisteredDeviceError(err)) setError(null);
      else setError(errorText(err, "Could not load more notifications."));
    }
  }, [deviceId, entries.length, listPath, request]);

  // The badge is right from the first paint: fetch the unread count as soon
  // as the device id is known (the poll below only fires after pollMs, and
  // never with pollMs: 0).
  useEffect(() => {
    if (deviceId) refreshUnread();
  }, [deviceId, refreshUnread]);

  // Keep the badge live: poll the unread count while the tab is visible.
  useEffect(() => {
    if (!deviceId || !pollMs || pollMs < 10000) return;
    const timer = setInterval(() => {
      if (document.hidden) return;
      refreshUnread();
    }, pollMs);
    const onVisible = () => {
      if (!document.hidden) refreshUnread();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [deviceId, pollMs, refreshUnread]);

  return {
    deviceId,
    entries,
    total,
    unreadCount,
    loading,
    error,
    refresh,
    refreshUnread,
    markRead,
    markAllRead,
    remove,
    clearInbox,
    loadMore,
  };
}

/**
 * Theme keys -> CSS custom properties (names match the vanilla module).
 * @type {Record<string, string>}
 */
const THEME_VARS = {
  accent: "--nn-accent",
  background: "--nn-surface",
  card: "--nn-card",
  border: "--nn-border",
  title: "--nn-title",
  text: "--nn-text",
  mutedText: "--nn-muted",
  dot: "--nn-dot",
  badgeText: "--nn-badge-text",
  delete: "--nn-delete",
  radius: "--nn-radius",
};

function BellIcon() {
  return (
    <svg className="nn-bell__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M12 22a2.4 2.4 0 0 0 2.4-2.4H9.6A2.4 2.4 0 0 0 12 22Zm7.2-5.6v-1l-1.6-1.6V9.1A5.9 5.9 0 0 0 13.2 3.3V2.4a1.2 1.2 0 1 0-2.4 0v.9A5.9 5.9 0 0 0 6.4 9.1v4.7l-1.6 1.6v1Z"
      />
    </svg>
  );
}

/**
 * The drop-in bell + inbox panel. Props mirror the vanilla options (see
 * NativeNotifyBellProps above): only appId and a credential are required —
 * prefer webKey.
 *
 * Import the styles once in your app: import "./nativeNotifyBell.css";
 * (Next.js Pages Router: global CSS can only be imported from pages/_app.)
 *
 * The NativeNotifyBellProps type on the parameter (below) is what makes the
 * optional props optional in a TypeScript project (allowJs + strict): without
 * it TypeScript infers the props from the destructuring and treats every prop
 * without a default as REQUIRED — and an "= undefined" default would type
 * that prop as undefined.
 * @param {NativeNotifyBellProps} props
 */
export default function NativeNotifyBell({
  appId,
  webKey,
  appToken,
  deviceId,
  storageKey,
  apiBase,
  take = 20,
  title = "Notifications",
  emptyText = "You are all caught up.",
  showCount = true,
  maxCount = 99,
  allowDelete = true,
  pollMs = 30000,
  theme,
  position = "bottom-right",
  onNotificationPress,
  onNavigate,
  onUnreadChange,
  className,
}) {
  const inbox = useNativeNotifyInbox({ appId, webKey, appToken, deviceId, storageKey, apiBase, take, pollMs });
  const [open, setOpen] = useState(false);
  const rootRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const buttonRef = useRef(/** @type {HTMLButtonElement | null} */ (null));
  const panelRef = useRef(/** @type {HTMLDivElement | null} */ (null));

  useEffect(() => {
    if (onUnreadChange) onUnreadChange(inbox.unreadCount);
  }, [inbox.unreadCount, onUnreadChange]);

  // Row click: mark read, then open the deep link (pushData.url).
  const openEntry = useCallback(
    /** @param {NativeNotifyInboxEntry} entry */
    (entry) => {
      const url = entryUrl(entry);
      inbox.markRead(entry);
      if (onNotificationPress) onNotificationPress(entry);
      if (!url) return;
      if (onNavigate) {
        onNavigate(url, entry);
        return;
      }
      if (isSafeUrl(url)) window.location.assign(url);
    },
    [inbox, onNavigate, onNotificationPress]
  );

  useEffect(() => {
    if (!open) return;
    /** @param {KeyboardEvent} event */
    const onKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    /** @param {MouseEvent} event */
    const onClick = (event) => {
      if (rootRef.current && !rootRef.current.contains(/** @type {Node | null} */ (event.target))) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, [open]);

  function toggle() {
    if (open) {
      setOpen(false);
      if (buttonRef.current) buttonRef.current.focus();
    } else {
      setOpen(true);
      inbox.refresh();
      if (panelRef.current) panelRef.current.focus();
    }
  }

  /** @type {Record<string, string>} */
  const themeStyle = {};
  if (theme) {
    /** @type {Record<string, string | undefined>} */
    const values = /** @type {any} */ (theme);
    Object.entries(THEME_VARS).forEach(([key, cssVar]) => {
      const value = values[key];
      if (value) themeStyle[cssVar] = String(value);
    });
  }

  const badgeText = showCount ? (inbox.unreadCount > maxCount ? maxCount + "+" : String(inbox.unreadCount)) : "";

  return (
    <div
      ref={rootRef}
      className={["nn-bell", "nn-bell--" + position, open ? "nn-bell--open" : "", className || ""]
        .filter(Boolean)
        .join(" ")}
      style={/** @type {import("react").CSSProperties} */ (themeStyle)}
    >
      <button
        ref={buttonRef}
        type="button"
        className="nn-bell__button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={title + (inbox.unreadCount > 0 ? ", " + inbox.unreadCount + " unread" : "")}
        onClick={toggle}
      >
        <BellIcon />
        {inbox.unreadCount > 0 && (
          <span className={"nn-bell__badge" + (showCount ? "" : " nn-bell__badge--dot")}>{badgeText}</span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          className="nn-bell__panel"
          role="dialog"
          aria-modal="false"
          aria-label={title}
          tabIndex={-1}
        >
          <div className="nn-bell__header">
            <span className="nn-bell__title">{title}</span>
            {inbox.unreadCount > 0 && (
              <button type="button" className="nn-bell__mark-all" onClick={inbox.markAllRead}>
                Mark all read
              </button>
            )}
            <button
              type="button"
              className="nn-bell__close"
              aria-label="Close notifications"
              onClick={() => {
                setOpen(false);
                if (buttonRef.current) buttonRef.current.focus();
              }}
            >
              &#215;
            </button>
          </div>

          <p className="nn-bell__status" role="status" aria-live="polite">
            {inbox.loading
              ? "Loading notifications…"
              : inbox.error
                ? inbox.error
                : inbox.unreadCount > 0
                  ? inbox.unreadCount + " unread"
                  : ""}
          </p>

          <ul className="nn-bell__list">
            {!inbox.loading && !inbox.error && inbox.entries.length === 0 && (
              <li className="nn-bell__empty">{emptyText}</li>
            )}
            {inbox.entries.map((entry) => (
              <li key={entry.entryId} className={"nn-bell__item" + (entry.read ? "" : " nn-bell__item--unread")}>
                <button type="button" className="nn-bell__item-main" onClick={() => openEntry(entry)}>
                  <span className="nn-bell__item-title">{entry.title || "Notification"}</span>
                  {entry.body ? <span className="nn-bell__item-body">{entry.body}</span> : null}
                  <span className="nn-bell__item-meta">
                    <span className="nn-bell__item-time">{timeAgo(entry.sentAt)}</span>
                    {!entry.read && <span className="nn-bell__item-dot" />}
                  </span>
                </button>
                {allowDelete && (
                  <button
                    type="button"
                    className="nn-bell__item-delete"
                    aria-label="Delete notification"
                    onClick={() => inbox.remove(entry)}
                  >
                    &#215;
                  </button>
                )}
              </li>
            ))}
          </ul>

          {inbox.entries.length < inbox.total && (
            <button type="button" className="nn-bell__more" onClick={inbox.loadMore}>
              Load more
            </button>
          )}
        </div>
      )}
    </div>
  );
}
