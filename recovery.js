// =====================================================
//  NEUCAST RECOVERY CENTER
//
//  The three announcement jobs the home page did not cover:
//    1. Recovery   - unread, expired-but-still-relevant and recently
//                    updated notices gathered in one place.
//    2. Progress   - how much of what you can see is read, split by
//                    university-wide and by your own course.
//    3. Confirming - the hexagonal "I have read this" control.
//
//  This file loads last, so it reuses rather than repeats:
//    data.js   -> noticeLife, expiryText, isAcknowledged, acknowledgeNotice
//    script.js -> announcements, canSee, isUnread, getKey, markRead,
//                  openAnnouncement, renderCards, student, modal, openItem
//  The admin half of confirmations lives in admin.js.
// =====================================================

// The center is only meaningful for a student, and only this page loads it
if (student) {

    // ---- What the center can be filtered by -----------------------------
    // "attention" is the default: the union of the other four.
    const RECOVERY_BUCKETS = [
        { key: "attention", label: "Needs you",  icon: "alert",   hint: "Unread, updated, or waiting for your confirmation." },
        { key: "unread",    label: "Unread",     icon: "mail",    hint: "Notices you have not opened yet." },
        { key: "ack",       label: "Confirm",    icon: "hexagon", hint: "Critical notices waiting for \u201CI have read this\u201D." },
        { key: "expired",   label: "Expired",    icon: "alert",   hint: "Past their expiry date, but you never dealt with them." },
        { key: "updated",   label: "Updated",    icon: "sliders", hint: "Changed by the admin in the last " + RECENT_UPDATE_DAYS + " days." },
        { key: "all",       label: "Everything", icon: "list",    hint: "Every announcement you can see." }
    ];

    let recoveryBucket = "attention";
    let recoveryTrigger = null;   // the control that opened the center, so focus can go back

    const recoveryModal = document.getElementById("recoveryModal");
    const recoveryTabsEl = document.getElementById("recoveryTabs");
    const recoveryListEl = document.getElementById("recoveryList");
    const recoverySubEl = document.getElementById("recoverySub");
    const trackerBodyEl = document.getElementById("trackerBody");
    const recoveryLiveEl = document.getElementById("recoveryLive");

    // =====================================================
    //  Reading the announcements
    // =====================================================

    // Every announcement this student can see, with where it stands attached
    function rcBuildRows() {
        const rows = [];

        for (let i = 0; i < announcements.length; i++) {
            const item = announcements[i];
            if (!canSee(item)) continue;
            rows.push({ item: item, life: noticeLife(item), key: getKey(item) });
        }

        return rows;
    }

    // Which rows belong in a bucket. "attention" is written as the union of
    // the other four, so the two can never drift apart.
    function rcMatch(row, bucket) {
        const item = row.item;
        const life = row.life;
        const unread = isUnread(item);
        const ackPending = life.needsAck && !isAcknowledged(student.id, item.id);

        if (bucket === "attention") {
            return rcMatch(row, "unread") || rcMatch(row, "ack") ||
                rcMatch(row, "expired") || rcMatch(row, "updated");
        }
        if (bucket === "unread") return unread;
        if (bucket === "ack") return ackPending;
        if (bucket === "expired") return life.isExpired && (unread || ackPending);
        if (bucket === "updated") return life.recentlyUpdated;
        return true;   // "all"
    }

    // Higher first: confirmations, then unread, then pinned, then expiry, then edits
    function rcScore(row) {
        let score = 0;
        const item = row.item;

        if (row.life.needsAck && !isAcknowledged(student.id, item.id)) score += 8;
        if (isUnread(item)) score += 4;
        if (item.pinned) score += 3;
        if (row.life.isExpired) score += 2;
        if (row.life.recentlyUpdated) score += 1;

        return score;
    }

    function rcPostedTime(item) {
        const posted = parseNoticeDate(item.date);
        return posted ? posted.getTime() : 0;
    }

    // The rows for one bucket, most urgent first and newest first within that
    function rcRowsFor(bucket) {
        const all = rcBuildRows();
        const rows = [];

        for (let i = 0; i < all.length; i++) {
            if (rcMatch(all[i], bucket)) rows.push(all[i]);
        }

        rows.sort(function (a, b) {
            const byScore = rcScore(b) - rcScore(a);
            if (byScore !== 0) return byScore;
            return rcPostedTime(b.item) - rcPostedTime(a.item);
        });

        return rows;
    }

    function rcBucketFor(key) {
        for (let i = 0; i < RECOVERY_BUCKETS.length; i++) {
            if (RECOVERY_BUCKETS[i].key === key) return RECOVERY_BUCKETS[i];
        }
        return RECOVERY_BUCKETS[0];
    }

    // How many rows fall into each bucket, including the "attention" total
    function rcBucketCounts() {
        const all = rcBuildRows();
        const counts = {};

        for (let i = 0; i < RECOVERY_BUCKETS.length; i++) {
            const key = RECOVERY_BUCKETS[i].key;
            let total = 0;

            for (let j = 0; j < all.length; j++) {
                if (rcMatch(all[j], key)) total++;
            }

            counts[key] = total;
        }

        return counts;
    }

    // Read/unread totals for the tracker, split the way the brief asks:
    // everything, university-wide, your own course, and confirmations.
    function rcTotals() {
        const rows = rcBuildRows();
        const totals = {
            total: 0, read: 0, unread: 0,
            ackTotal: 0, ackDone: 0, ackPending: 0,
            university: 0, universityRead: 0,
            course: 0, courseRead: 0,
            expired: 0
        };

        for (let i = 0; i < rows.length; i++) {
            const item = rows[i].item;
            const life = rows[i].life;
            const unread = isUnread(item);

            totals.total++;
            if (unread) {
                totals.unread++;
            } else {
                totals.read++;
            }

            if (audienceOf(item) === "all") {
                totals.university++;
                if (!unread) totals.universityRead++;
            } else {
                totals.course++;
                if (!unread) totals.courseRead++;
            }

            if (life.needsAck) {
                const done = isAcknowledged(student.id, item.id);
                totals.ackTotal++;
                if (done) totals.ackDone++; else totals.ackPending++;
            }

            if (rcMatch(rows[i], "expired")) totals.expired++;
        }

        return totals;
    }

    // =====================================================
    //  The read-progress tracker
    // =====================================================

    // One linear meter. role="progressbar" is what tells a screen reader the
    // numbers, so the bar is never the only way to read the value.
    function rcMeterHtml(label, done, total, tone) {
        if (total === 0) {
            return '<div class="meter meter--' + tone + '">' +
                '<div class="meter__top"><span class="meter__label">' + escapeHtml(label) + "</span>" +
                '<span class="meter__value">0</span></div>' +
                '<em class="meter__empty">Nothing to measure yet.</em></div>';
        }

        const percent = Math.round(100 * done / total);

        return '<div class="meter meter--' + tone + '">' +
            '<div class="meter__top"><span class="meter__label">' + escapeHtml(label) + "</span>" +
            '<span class="meter__value">' + done + " / " + total + " \u00B7 " + percent + "%</span></div>" +
            '<div class="meter__bar" role="progressbar" aria-label="' + escapeHtml(label) + '" ' +
            'aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + percent + '" ' +
            'aria-valuetext="' + done + " of " + total + '">' +
            '<span class="meter__fill" style="width:' + percent + '%"></span></div></div>';
    }

    function rcTrackerHtml() {
        const totals = rcTotals();
        const percent = totals.total === 0 ? 0 : Math.round(100 * totals.read / totals.total);

        // Same maths as the small ring in the right panel: the filled arc is
        // C x (read / total), where C = 2 pi r.
        const radius = 54;
        const circumference = 2 * Math.PI * radius;
        const filled = circumference * (percent / 100);

        return '<div class="pring">' +
            '<svg viewBox="0 0 120 120" aria-hidden="true">' +
            '<circle class="pring__track" cx="60" cy="60" r="' + radius + '"/>' +
            '<circle class="pring__fill" cx="60" cy="60" r="' + radius + '" transform="rotate(-90 60 60)" ' +
            'stroke-dasharray="' + filled.toFixed(2) + " " + circumference.toFixed(2) + '"/>' +
            '<circle class="pring__edge" cx="60" cy="60" r="60"/></svg>' +
            '<span class="pring__text"><strong>' + percent + "%</strong>" +
            "<small>read</small>" +
            "<em>" + totals.read + " of " + totals.total + " opened</em>" +
            "<em>C = 2\u03C0r = " + circumference.toFixed(2) + "</em></span></div>" +
            '<div class="meters">' +
            rcMeterHtml("University-wide", totals.universityRead, totals.university, "yellow") +
            rcMeterHtml("My course (" + student.course + ")", totals.courseRead, totals.course, "violet") +
            rcMeterHtml("Confirmations received", totals.ackDone, totals.ackTotal, "ink") +
            "</div>";
    }

    // =====================================================
    //  The acknowledgment control (hexagons)
    // =====================================================

    // A confirmation button. The button is a plain rectangle so the focus ring
    // from base.css can never be clipped away by the hexagon; only the artwork
    // inside is clipped.
    function rcAckButtonHtml(item, compact) {
        const classes = "ack-btn" + (compact ? " ack-btn--sm" : "");

        return '<button type="button" class="' + classes + '" data-action="ack" data-id="' + item.id + '">' +
            '<span class="ack-btn__hex" aria-hidden="true"></span>' +
            '<span class="ack-btn__label">' + icon("hexagon") + " I have read this</span></button>";
    }

    // The "already confirmed" twin, which is a status and not a control.
    // role="status" is put on the whole block by ackControlHtml(), so the
    // explanation is announced together with the word "Confirmed".
    function rcConfirmedHtml(compact) {
        return '<span class="ack-btn ack-btn--done' + (compact ? " ack-btn--sm" : "") + '">' +
            '<span class="ack-btn__hex" aria-hidden="true"></span>' +
            '<span class="ack-btn__label">' + icon("check") + " Confirmed</span></span>";
    }

    // Built into the announcement details pop-up by script.js
    function ackControlHtml(item) {
        if (!student || item.requiresAck !== true) return "";

        const tallyLine = "The admin dashboard shows how many students have confirmed.";

        if (isAcknowledged(student.id, item.id)) {
            // tabindex="-1" lets rcConfirm() move focus here after the button it
            // replaced disappears, so keyboard users are not dropped on <body>
            return '<div class="ack-block" role="status" tabindex="-1">' + rcConfirmedHtml(false) +
                '<div class="ack-block__text"><strong>Confirmation recorded</strong>' +
                "<p>You confirmed that you have read this announcement.</p>" +
                "<small>" + tallyLine + "</small></div></div>";
        }

        return '<div class="ack-block">' + rcAckButtonHtml(item, false) +
            '<div class="ack-block__text"><strong>Confirmation required</strong>' +
            "<p>This is a critical notice. Confirm that you have read it.</p>" +
            "<small>" + tallyLine + "</small></div></div>";
    }

    // =====================================================
    //  Drawing the center
    // =====================================================

    function rcSummary(totals) {
        if (totals.total === 0) return "Nothing has been posted for you yet.";

        if (totals.unread === 0 && totals.ackPending === 0 && totals.expired === 0) {
            return "All caught up \u00B7 " + totals.read + " read";
        }

        const parts = [totals.unread + " unread"];
        if (totals.ackPending > 0) parts.push(totals.ackPending + " waiting for confirmation");
        if (totals.expired > 0) parts.push(totals.expired + " expired but still relevant");

        return parts.join(" \u00B7 ");
    }

    // A shape, then the words. The shape is never the only signal.
    function rcEmptyHtml(bucket, totals) {
        if (totals.total === 0) {
            return '<div class="recovery-empty c-general"><span class="shape circle" aria-hidden="true"></span>' +
                "<strong>No announcements yet</strong>" +
                "<small>University-wide notices and " + escapeHtml(student.course) +
                " notices will show up here.</small></div>";
        }

        if (bucket.key === "attention") {
            return '<div class="recovery-empty c-general"><span class="shape hexagon" aria-hidden="true"></span>' +
                "<strong>All caught up</strong>" +
                "<small>Nothing is waiting for you right now.</small></div>";
        }

        return '<div class="recovery-empty c-academic"><span class="shape square" aria-hidden="true"></span>' +
            "<strong>Nothing in " + escapeHtml(bucket.label) + "</strong>" +
            "<small>" + escapeHtml(bucket.hint) + "</small></div>";
    }

    // One notice: [category cell] [tags, title, text, meta] [actions]
    function rcRowHtml(row) {
        const item = row.item;
        const life = row.life;
        const cat = CATEGORIES[row.key];
        const confirmed = life.needsAck && isAcknowledged(student.id, item.id);

        let tags = '<span class="rc-tag">' + escapeHtml(cat.name) + "</span>";
        if (isUnread(item)) tags += '<span class="rc-tag rc-tag--unread">Unread</span>';
        if (life.needsAck) {
            tags += confirmed
                ? '<span class="rc-tag rc-tag--done">' + icon("check") + " Confirmed</span>"
                : '<span class="rc-tag rc-tag--ack">' + icon("hexagon") + " Confirmation needed</span>";
        }
        if (life.isExpired) {
            tags += '<span class="rc-tag rc-tag--expired">' + icon("alert") + " " + escapeHtml(expiryText(life)) + "</span>";
        } else if (life.isExpiringSoon) {
            tags += '<span class="rc-tag rc-tag--soon">' + icon("calendar") + " " + escapeHtml(expiryText(life)) + "</span>";
        }
        if (life.recentlyUpdated) tags += '<span class="rc-tag rc-tag--updated">Updated</span>';
        if (item.pinned) tags += '<span class="rc-tag rc-tag--pin">' + icon("pin") + " Pinned</span>";

        return '<article class="rc-row c-' + row.key + (life.isExpired ? " is-expired" : "") + '">' +
            '<span class="rc-row__shape"><span class="shape sm ' + cat.shape + '" aria-hidden="true"></span></span>' +
            '<div class="rc-row__main">' +
            '<div class="rc-row__tags">' + tags + "</div>" +
            '<strong class="rc-row__title">' + escapeHtml(item.title) + "</strong>" +
            '<span class="rc-row__text">' + escapeHtml(item.details) + "</span>" +
            '<span class="rc-row__meta">' +
            "<span>" + icon("calendar") + escapeHtml(item.date) + "</span>" +
            "<span>" + audienceHtml(item) + "</span></span></div>" +
            '<div class="rc-row__actions">' +
            (life.needsAck && !confirmed ? rcAckButtonHtml(item, true) : "") +
            '<button type="button" class="nb-btn nb-btn--sm nb-btn--ink" data-action="open" data-id="' + item.id + '">' +
            "Open " + icon("arrowright") + "</button></div></article>";
    }

    function renderRecovery() {
        if (!student) return;

        const totals = rcTotals();
        const counts = rcBucketCounts();
        const bucket = rcBucketFor(recoveryBucket);

        recoverySubEl.textContent = rcSummary(totals);
        trackerBodyEl.innerHTML = rcTrackerHtml();

        let tabs = "";
        for (let i = 0; i < RECOVERY_BUCKETS.length; i++) {
            const entry = RECOVERY_BUCKETS[i];
            const active = entry.key === recoveryBucket;

            tabs += '<button type="button" role="tab" id="rcTab-' + entry.key + '" class="bucket-tab" ' +
                'data-bucket="' + entry.key + '" aria-selected="' + active + '" ' +
                'aria-controls="recoveryList" tabindex="' + (active ? "0" : "-1") + '">' +
                icon(entry.icon) + entry.label +
                '<span class="bucket-tab__count">' + counts[entry.key] + "</span></button>";
        }
        recoveryTabsEl.innerHTML = tabs;
        recoveryListEl.setAttribute("aria-labelledby", "rcTab-" + recoveryBucket);

        // The list is rebuilt from scratch, so note where focus was and put it back
        const active = document.activeElement;
        const insideList = active && recoveryListEl.contains(active);
        const focusAction = insideList ? active.dataset.action : "";
        const focusId = insideList ? active.dataset.id : "";

        const rows = rcRowsFor(recoveryBucket);

        if (rows.length === 0) {
            recoveryListEl.innerHTML = rcEmptyHtml(bucket, totals);
        } else {
            let html = "";
            for (let i = 0; i < rows.length; i++) {
                html += rcRowHtml(rows[i]);
            }
            recoveryListEl.innerHTML = html;
        }

        if (focusAction) {
            // The button is usually still there; if confirming removed it, fall
            // back to that row's Open button, and then to the active tab.
            const again = recoveryListEl.querySelector('[data-action="' + focusAction + '"][data-id="' + focusId + '"]') ||
                recoveryListEl.querySelector('[data-action="open"][data-id="' + focusId + '"]') ||
                document.getElementById("rcTab-" + recoveryBucket);
            if (again) again.focus();
        }
    }

    // =====================================================
    //  Confirming a notice
    // =====================================================

    function rcFindItem(id) {
        for (let i = 0; i < announcements.length; i++) {
            if (announcements[i].id === id) return announcements[i];
        }
        return null;
    }

    function rcConfirm(id) {
        if (!student) return;

        const item = rcFindItem(id);
        if (!item) return;

        const firstTime = acknowledgeNotice(student.id, id);

        // "I have read this" is a stronger claim than merely opening the notice,
        // so confirming also marks it read. Without this a student could confirm
        // a critical notice and still see it flagged Unread.
        const wasUnread = isUnread(item);

        // Swap the button for the "confirmed" state in the details pop-up too.
        // The button being replaced is usually the focused element, so focus is
        // handed to the new status block rather than being dropped on <body>.
        const slot = document.getElementById("ackSlot");
        if (slot && !modal.hidden && openItem && openItem.id === id) {
            const wasFocused = slot.contains(document.activeElement);

            slot.innerHTML = ackControlHtml(item);

            if (wasFocused) {
                const status = slot.querySelector('[role="status"]');
                if (status) status.focus();
            }
        }

        recoveryLiveEl.textContent = firstTime
            ? "Confirmed. You have read \u201C" + item.title + "\u201D."
            : "You had already confirmed this announcement.";

        if (wasUnread) {
            // markRead redraws the sidebar, the center and the cards for us
            markRead([id]);
        } else {
            refreshRecovery();
            renderCards();   // the "Confirm" flag on the card changes to "Confirmed"
        }
    }

    // =====================================================
    //  Opening and closing the center
    // =====================================================

    function refreshRecovery() {
        if (!student) return;

        const counts = rcBucketCounts();
        rcSetBadge("recoveryBadge", counts.attention);
        rcSetBadge("ringRecoveryCount", counts.attention);

        if (!recoveryModal.hidden) renderRecovery();
    }

    function rcSetBadge(id, total) {
        const element = document.getElementById(id);
        if (!element) return;

        element.textContent = total;
        element.hidden = total === 0;
    }

    function openRecovery() {
        recoveryTrigger = document.activeElement;
        recoveryModal.hidden = false;
        renderRecovery();

        const firstTab = document.getElementById("rcTab-" + recoveryBucket);
        if (firstTab) firstTab.focus();
    }

    function closeRecovery() {
        recoveryModal.hidden = true;

        // The trigger is re-drawn whenever the sidebar re-renders, so it may be gone
        const back = (recoveryTrigger && document.contains(recoveryTrigger)) ? recoveryTrigger : null;
        if (back) back.focus();

        recoveryTrigger = null;
    }

    // =====================================================
    //  Events
    // =====================================================

    recoveryTabsEl.addEventListener("click", function (event) {
        const tab = event.target.closest(".bucket-tab");
        if (!tab) return;

        recoveryBucket = tab.dataset.bucket;
        renderRecovery();

        // Drawing the tabs replaces them, which would drop focus onto <body>.
        // Put it back on the tab that is now active.
        const again = document.getElementById("rcTab-" + recoveryBucket);
        if (again) again.focus();
    });

    // Left/right arrows move along the tab strip, as a tablist should
    recoveryTabsEl.addEventListener("keydown", function (event) {
        let index = -1;
        for (let i = 0; i < RECOVERY_BUCKETS.length; i++) {
            if (RECOVERY_BUCKETS[i].key === recoveryBucket) index = i;
        }
        if (index === -1) return;

        const last = RECOVERY_BUCKETS.length - 1;
        let next = -1;

        if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % RECOVERY_BUCKETS.length;
        else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index - 1 + last + 1) % RECOVERY_BUCKETS.length;
        else if (event.key === "Home") next = 0;
        else if (event.key === "End") next = last;
        else return;

        event.preventDefault();
        recoveryBucket = RECOVERY_BUCKETS[next].key;
        renderRecovery();

        const tab = document.getElementById("rcTab-" + recoveryBucket);
        if (tab) tab.focus();
    });

    // Open a notice, or confirm it, from anywhere in the center
    recoveryListEl.addEventListener("click", function (event) {
        const button = event.target.closest("button");
        if (!button) return;

        if (button.dataset.action === "ack") {
            rcConfirm(Number(button.dataset.id));
        } else if (button.dataset.action === "open") {
            openAnnouncement(Number(button.dataset.id));
        }
    });

    // The confirmation button inside the announcement details pop-up
    document.getElementById("ackSlot").addEventListener("click", function (event) {
        const button = event.target.closest("button");
        if (button && button.dataset.action === "ack") {
            rcConfirm(Number(button.dataset.id));
        }
    });

    // The right panel is re-drawn on every sidebar render, so catch the click
    // on the container instead of on the button.
    readRing.addEventListener("click", function (event) {
        const button = event.target.closest("button");
        if (button && button.dataset.action === "recovery") openRecovery();
    });

    document.querySelectorAll(".js-recovery").forEach(function (link) {
        link.addEventListener("click", function (event) {
            event.preventDefault();
            openRecovery();
        });
    });

    document.getElementById("closeRecovery").addEventListener("click", function () {
        closeRecovery();
    });

    recoveryModal.addEventListener("click", function (event) {
        if (event.target === recoveryModal) closeRecovery();
    });

    // Escape closes the details pop-up first, then the center.
    // This listener is registered in the capture phase on purpose: script.js has
    // its own (bubble-phase) Escape handler that also closes the details pop-up,
    // and it runs first. Capturing here lets this handler see whether the details
    // are still open and stop the other handler from closing the center too.
    document.addEventListener("keydown", function (event) {
        if (event.key !== "Escape" || recoveryModal.hidden) return;

        event.stopImmediatePropagation();

        if (!modal.hidden) {
            modal.hidden = true;
            return;
        }
        closeRecovery();
    }, true);

    // While the center is open, Tab stays inside it
    recoveryModal.addEventListener("keydown", function (event) {
        if (event.key !== "Tab") return;

        const candidates = recoveryModal.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])');
        const reachable = [];

        for (let i = 0; i < candidates.length; i++) {
            if (candidates[i].getClientRects().length > 0) reachable.push(candidates[i]);
        }
        if (reachable.length === 0) return;

        const first = reachable[0];
        const last = reachable[reachable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    });

    // =====================================================
    //  Start
    // =====================================================

    refreshRecovery();

    // ----- The two functions script.js needs -----
    // script.js loads before this file, so it cannot close over these; it
    // reaches them through a guarded `typeof x === "function"` check instead.
    // Keeping them on window is what makes that check succeed.
    window.refreshRecovery = refreshRecovery;   // keeps the badges and the open panel in step
    window.ackControlHtml = ackControlHtml;     // drawn into #ackSlot when a notice is opened
}
