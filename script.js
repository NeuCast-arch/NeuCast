// =====================================================
//  NeuCast homepage (index.html)
//  Load order (see boot.js tag): icons, ui, cloud-config, cloud, data, script, calendar, calc
// =====================================================

// ===== 1. Who is viewing the page? =====
const student = getCurrentStudent();
const adminView = isLoggedIn();

if (!student && !adminView) {
    window.location.replace("login.html");
}

let announcements = sortPinnedFirst(loadAnnouncements());
let readIds = student ? loadReadIds(student.id) : [];

// ===== 2. Page elements =====
const list = document.getElementById("announcementList");
const searchInput = document.getElementById("searchInput");
const sideNav = document.getElementById("sideNav");
const categoryBar = document.getElementById("categoryBar");
const readRing = document.getElementById("readRing");
const bellCount = document.getElementById("bellCount");
const markAllBtn = document.getElementById("markAllRead");
const resultCount = document.getElementById("resultCount");
const modal = document.getElementById("modal");
const aboutModal = document.getElementById("aboutModal");
const settingsModal = document.getElementById("settingsModal");
const questionsModal = document.getElementById("questionsModal");
const recoveryModal = document.getElementById("recoveryModal");
const needsCard = document.getElementById("needsCard");

// What is selected right now
let activeCategory = "all";   // category chips
let activeSmart = "all";      // quick filters
let activeDate = "";          // calendar day, like "2026-10-4"
let quickFiltersHidden = false; // "Show" row collapsed via Unshow button
let openItem = null;          // the announcement open in the details pop-up
let recoveryScope = "all";    // all, university, or course

const categoryKeys = Object.keys(CATEGORIES);

// ===== 3. Small helpers =====
function capitalize(word) {
    return word.charAt(0).toUpperCase() + word.slice(1);
}

function plural(count, one, many) {
    return count + " " + (count === 1 ? one : many);
}

// Turns a date into text like "2026-10-4" so two dates can be compared
function dateKey(date) {
    return date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate();
}

// Puts keyboard focus on an element after a re-render replaced the old one
function refocus(selector) {
    const el = document.querySelector(selector);
    if (el) el.focus();
}

// ===== 4. Header and intro =====
if (student) {
    document.getElementById("userName").textContent = student.name.split(" ")[0];
    document.getElementById("userSub").textContent = student.course;
    document.getElementById("userLink").href = "profile.html";
    document.getElementById("userLink").setAttribute("aria-label", "My profile: " + student.name);
    document.getElementById("greeting").textContent = NeuUI.greeting() + ", " + student.name.split(" ")[0];
    document.getElementById("studentInfo").textContent = student.course + " · " + student.year + " · ID " + student.id;
    document.getElementById("navRecovery").hidden = false;

    document.getElementById("studentAction").addEventListener("click", function () {
        studentLogOut();
        window.location.href = "login.html";
    });
} else {
    document.getElementById("userName").textContent = "Admin";
    document.getElementById("userSub").textContent = "Open dashboard";
    document.getElementById("userLink").href = "admin.html";
    document.getElementById("userLink").setAttribute("aria-label", "Open the admin dashboard");
    document.getElementById("greeting").textContent = "Admin preview";
    document.getElementById("studentInfo").textContent = "Showing every announcement, for all courses.";

    const action = document.getElementById("studentAction");
    action.innerHTML = icon("arrowleft") + " Back to dashboard";
    action.addEventListener("click", function () { window.location.href = "admin.html"; });
    markAllBtn.hidden = true;
}

// Phone menu
const menuBtn = document.getElementById("menuBtn");
const mainNav = document.getElementById("mainNav");
menuBtn.addEventListener("click", function () {
    const open = mainNav.classList.toggle("is-open");
    menuBtn.setAttribute("aria-expanded", String(open));
});
mainNav.addEventListener("click", function (event) {
    if (event.target.closest("a, button")) {
        mainNav.classList.remove("is-open");
        menuBtn.setAttribute("aria-expanded", "false");
    }
});

// ===== 5. Rules: who can see what =====
function canSee(item) {
    if (adminView) return true;
    if (!student) return false;
    const audience = audienceOf(item);
    return audience === "all" || audience === student.course;
}

function isUnread(item) {
    if (!student) return false;
    return !readIds.includes(item.id);
}

// ===== 6. Filters =====
const SMART_FILTERS = [
    { name: "all", label: "All", studentOnly: false },
    { name: "unread", label: "Unread", studentOnly: true },
    { name: "pinned", label: "Pinned", studentOnly: false },
    { name: "university", label: "University-wide", studentOnly: false },
    { name: "course", label: "My course", studentOnly: true }
];

function matchesSmart(item, name) {
    if (name === "unread") return isUnread(item);
    if (name === "pinned") return item.pinned === true;
    if (name === "course") return audienceOf(item) !== "all";
    if (name === "university") return audienceOf(item) === "all";
    return true;
}

function countSmart(name) {
    let count = 0;
    for (let i = 0; i < announcements.length; i++) {
        if (canSee(announcements[i]) && matchesSmart(announcements[i], name)) count++;
    }
    return count;
}

function countNotices(key) {
    let count = 0;
    for (let i = 0; i < announcements.length; i++) {
        if (canSee(announcements[i]) && (key === "all" || getKey(announcements[i]) === key)) count++;
    }
    return count;
}

function renderFilters() {
    // Category chips: the shape next to the name is part of the identity
    let html = '<button type="button" class="chip" data-category="all" aria-pressed="' + (activeCategory === "all") + '">All' +
        '<span class="chip__count">' + countNotices("all") + "</span></button>";
    for (let i = 0; i < categoryKeys.length; i++) {
        const key = categoryKeys[i];
        const cat = CATEGORIES[key];
        html += '<button type="button" class="chip c-' + key + '" data-category="' + key + '" aria-pressed="' + (activeCategory === key) + '">' +
            '<span class="shape sm ' + cat.shape + '" aria-hidden="true"></span>' + cat.name +
            '<span class="chip__count">' + countNotices(key) + "</span></button>";
    }
    categoryBar.innerHTML = html;

    // Quick filters
    let chips = "";
    for (let i = 0; i < SMART_FILTERS.length; i++) {
        const f = SMART_FILTERS[i];
        if (f.studentOnly && !student) continue;
        chips += '<button type="button" class="chip" data-smart="' + f.name + '" aria-pressed="' + (f.name === activeSmart) + '">' + f.label +
            '<span class="chip__count">' + countSmart(f.name) + "</span></button>";
    }
    const quick = '<button type="button" class="chip chip--toggle" id="toggleQuickFilters" aria-pressed="' + quickFiltersHidden + '">' +
        (quickFiltersHidden ? "Show" : "Unshow") + "</button>" +
        '<div class="quick-filters-collapse' + (quickFiltersHidden ? " is-hidden" : "") + '" id="quickFiltersCollapse">' +
        '<div class="quick-filters-inner">' + chips + "</div></div>";
    sideNav.innerHTML = quick;
}

categoryBar.addEventListener("click", function (event) {
    const chip = event.target.closest("button");
    if (!chip) return;
    setCategory(chip.dataset.category);
    refocus('#categoryBar [data-category="' + chip.dataset.category + '"]');
});

sideNav.addEventListener("click", function (event) {
    const chip = event.target.closest("button");
    if (!chip) return;
    if (chip.id === "toggleQuickFilters") {
        quickFiltersHidden = !quickFiltersHidden;
        // Toggle the class in place (rather than re-rendering innerHTML)
        // so the CSS transition on the collapse wrapper actually plays.
        const collapse = document.getElementById("quickFiltersCollapse");
        if (collapse) collapse.classList.toggle("is-hidden", quickFiltersHidden);
        chip.textContent = quickFiltersHidden ? "Show" : "Unshow";
        chip.setAttribute("aria-pressed", String(quickFiltersHidden));
        return;
    }
    chooseSmart(chip.dataset.smart);
    refocus('#sideNav [data-smart="' + chip.dataset.smart + '"]');
});

function setCategory(name) {
    activeCategory = name;
    renderFilters();
    renderCards();
}

function chooseSmart(name) {
    activeSmart = name;
    renderFilters();
    renderCards();
}

function clearFilters() {
    activeCategory = "all";
    activeSmart = "all";
    activeDate = "";
    searchInput.value = "";
    renderFilters();
    renderCards();
    if (typeof renderCalendar === "function") renderCalendar();
}

// ===== 7. Progress ring (students only) =====
const RING_RADIUS = 24;

function countRead() {
    let total = 0;
    let read = 0;
    for (let i = 0; i < announcements.length; i++) {
        if (!canSee(announcements[i])) continue;
        total++;
        if (!isUnread(announcements[i])) read++;
    }
    return { total: total, read: read };
}

function ackTotals() {
    let total = 0;
    let done = 0;
    for (let i = 0; i < announcements.length; i++) {
        const item = announcements[i];
        if (!canSee(item) || !needsAck(item)) continue;
        total++;
        if (hasAcked(item, student.id)) done++;
    }
    return { total: total, done: done };
}

function renderRing() {
    readRing.setAttribute("aria-busy", "false");
    if (!student) {
        readRing.innerHTML = "";
        return;
    }
    const counts = countRead();
    const circumference = 2 * Math.PI * RING_RADIUS;
    const fraction = counts.total === 0 ? 0 : counts.read / counts.total;
    const filled = circumference * fraction;
    const acks = ackTotals();
    const allRead = counts.total > 0 && counts.read === counts.total;

    let headline = counts.total === 0 ? "Nothing yet" : counts.read + " of " + counts.total + " read";
    let sub = allRead ? "You're all caught up" : plural(counts.total - counts.read, "unread announcement", "unread announcements");
    if (counts.total === 0) sub = "New announcements will appear here";

    readRing.innerHTML = '<div class="panel progress sk-fade-in">' +
        '<svg viewBox="0 0 64 64" role="img" aria-label="' + Math.round(fraction * 100) + ' percent read" title="Ring length = C × (read ÷ total) = ' +
        circumference.toFixed(2) + " × " + fraction.toFixed(2) + " = " + filled.toFixed(2) + '">' +
        '<circle class="ring-track" cx="32" cy="32" r="' + RING_RADIUS + '"/>' +
        '<circle class="ring-fill' + (allRead ? " is-done" : "") + '" cx="32" cy="32" r="' + RING_RADIUS + '" transform="rotate(-90 32 32)" stroke-dasharray="' +
        filled.toFixed(2) + " " + circumference.toFixed(2) + '"/></svg>' +
        '<div class="progress__text"><strong>' + headline + "</strong><span>" + sub + "</span>" +
        (acks.total > 0 ? '<span class="progress__ack">' + acks.done + " of " + acks.total + " confirmations done</span>" : "") + "</div>" +
        (!allRead && counts.total > 0 ? '<button type="button" class="btn btn--secondary btn--sm" id="showUnread">Show unread</button>' : "") +
        "</div>";
}

readRing.addEventListener("click", function (event) {
    if (event.target.closest("#showUnread")) {
        activeCategory = "all";
        activeDate = "";
        searchInput.value = "";
        chooseSmart("unread");
        scrollToList();
    }
});

// ===== 8. The announcement cards =====
function getCourseName(code) {
    for (let i = 0; i < COURSES.length; i++) {
        if (COURSES[i].code === code) return COURSES[i].name;
    }
    return code;
}

// One status for the card, in order of importance
function statusTag(item) {
    if (isExpired(item)) return '<span class="tag">' + icon("clock") + " Expired</span>";
    if (student && needsAck(item)) {
        if (hasAcked(item, student.id)) return '<span class="tag tag--success">' + icon("checkcircle") + " Confirmed</span>";
        return '<span class="tag tag--warning">' + icon("alert") + " Needs confirmation</span>";
    }
    return "";
}

function filteredItems() {
    const searchText = searchInput.value.toLowerCase().trim();
    const out = [];
    for (let i = 0; i < announcements.length; i++) {
        const item = announcements[i];
        if (!canSee(item)) continue;
        if (activeCategory !== "all" && getKey(item) !== activeCategory) continue;
        if (!matchesSmart(item, activeSmart)) continue;
        if (settings.hideRead && student && !isUnread(item)) continue;
        if (activeDate !== "" && dateKey(new Date(item.date)) !== activeDate) continue;
        if (searchText !== "" && !item.title.toLowerCase().includes(searchText) && !item.details.toLowerCase().includes(searchText)) continue;
        out.push(item);
    }
    return out;
}

function filtersActive() {
    return activeCategory !== "all" || activeSmart !== "all" || activeDate !== "" || searchInput.value.trim() !== "";
}

function renderCards() {
    const items = filteredItems();
    let html = "";

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const key = getKey(item);
        const cat = CATEGORIES[key];
        let preview = item.details;
        if (preview.length > 140) preview = preview.slice(0, 140).replace(/\s+\S*$/, "") + "…";
        const unread = isUnread(item);

        html += '<article class="notice c-' + key + (unread ? " unread" : "") + (item.pinned ? " pinned" : "") + '">' +
            '<span class="shape-tile lg" aria-hidden="true"><span class="shape ' + cat.shape + '"></span></span>' +
            '<div class="notice__main"><div class="notice__tags">' +
            '<span class="tag c-' + key + '"><span class="shape ' + cat.shape + '" aria-hidden="true"></span>' + cat.name + "</span>" +
            (unread ? '<span class="tag tag--info">' + icon("mail") + " New</span>" : "") +
            (item.pinned ? '<span class="tag">' + icon("pin") + " Pinned</span>" : "") +
            statusTag(item) + "</div>" +
            "<h3>" + escapeHtml(item.title) + "</h3>" +
            "<p>" + escapeHtml(preview) + "</p>" +
            '<div class="notice__foot"><span class="notice__meta">' + icon("calendar") + " " + escapeHtml(item.date) +
            ' <span aria-hidden="true">·</span> ' + audienceHtml(item) + "</span>" +
            '<button type="button" class="btn btn--secondary btn--sm read-btn" data-id="' + item.id + '" aria-label="Read more: ' +
            escapeHtml(item.title) + '">Read more</button></div></div></article>';
    }

    if (items.length === 0) html = emptyHtml();

    list.innerHTML = html;
    list.setAttribute("aria-busy", "false");

    const total = countNotices("all");
    resultCount.textContent = items.length === 0 ? "" :
        (filtersActive() ? plural(items.length, "announcement", "announcements") + " match" + (items.length === 1 ? "es" : "") + " your filters" :
            plural(items.length, "announcement", "announcements"));
    document.getElementById("announcementsTitle").dataset.total = total;
}

function emptyHtml() {
    const tile = '<span class="shape-tile lg" aria-hidden="true"><span class="shape circle" style="--c:var(--text-2)"></span></span>';
    if (filtersActive()) {
        return '<div class="empty">' + tile + "<h3>No matching announcements</h3><p>Try a different word, or clear the filters to see everything.</p>" +
            '<button type="button" class="btn btn--secondary" id="clearFilters">Clear filters</button></div>';
    }
    if (settings.hideRead && student && countNotices("all") > 0) {
        return '<div class="empty">' + tile + "<h3>You're all caught up</h3><p>Everything has been read. Read announcements are hidden in your settings.</p>" +
            '<button type="button" class="btn btn--secondary" id="showRead">Show read announcements</button></div>';
    }
    return '<div class="empty">' + tile + "<h3>No announcements yet</h3><p>When the university posts something, you will see it here.</p></div>";
}

list.addEventListener("click", function (event) {
    const readBtn = event.target.closest(".read-btn");
    if (readBtn) {
        openAnnouncement(Number(readBtn.dataset.id), readBtn);
        return;
    }
    if (event.target.closest("#clearFilters")) clearFilters();
    if (event.target.closest("#showRead")) {
        settings.hideRead = false;
        saveSettings();
        renderCards();
    }
});

function scrollToList() {
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById("announcements").scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
}

// ===== 9. Bell, search, mark all, links =====
function updateBell() {
    let total = 0;
    for (let i = 0; i < announcements.length; i++) {
        const item = announcements[i];
        if (!canSee(item) || getKey(item) !== "urgent") continue;
        if (student && !isUnread(item)) continue;
        total++;
    }
    bellCount.textContent = total;
    bellCount.hidden = total === 0;
    document.getElementById("bellBtn").setAttribute("aria-label", total === 0 ? "Urgent announcements" : "Urgent announcements, " + plural(total, "unread", "unread"));
}

document.getElementById("bellBtn").addEventListener("click", function () {
    activeSmart = "all";
    activeDate = "";
    searchInput.value = "";
    setCategory("urgent");
    scrollToList();
});

document.getElementById("searchForm").addEventListener("submit", function (event) {
    event.preventDefault();
    renderCards();
    scrollToList();
});
searchInput.addEventListener("input", NeuUI.debounce(function () {
    renderCards();
}, 150));

document.querySelectorAll(".js-show").forEach(function (link) {
    link.addEventListener("click", function (event) {
        event.preventDefault();
        scrollToList();
    });
});

markAllBtn.addEventListener("click", function () {
    if (!student) return;
    const ids = [];
    for (let i = 0; i < announcements.length; i++) {
        if (canSee(announcements[i]) && isUnread(announcements[i])) ids.push(announcements[i].id);
    }
    if (ids.length === 0) {
        NeuUI.toast("Everything is already marked as read", "info");
        return;
    }
    markRead(ids);
    NeuUI.toast(plural(ids.length, "announcement", "announcements") + " marked as read", "success");
});

function markRead(ids) {
    for (let i = 0; i < ids.length; i++) {
        if (!readIds.includes(ids[i])) readIds.push(ids[i]);
    }
    saveReadIds(student.id, readIds);
    for (let i = 0; i < announcements.length; i++) {
        if (ids.includes(announcements[i].id)) saveReadVersion(student.id, announcements[i]);
    }
    refreshViews();
}

// Redraws everything that depends on read / confirmation state
function refreshViews() {
    updateBell();
    renderRecovery();
    renderFilters();
    renderRing();
    renderCards();
    if (typeof renderCalendar === "function") renderCalendar();
}

// ===== 10. Announcement details pop-up =====
const askAbout = document.getElementById("askAbout");

function openAnnouncement(id, trigger) {
    let item = null;
    for (let i = 0; i < announcements.length; i++) {
        if (announcements[i].id === id) item = announcements[i];
    }
    if (!item) return;

    openItem = item;
    askAbout.hidden = !student;

    const key = getKey(item);
    const cat = CATEGORIES[key];
    const badge = document.getElementById("modalBadge");
    badge.className = "tag c-" + key;
    badge.innerHTML = '<span class="shape ' + cat.shape + '" aria-hidden="true"></span>' + cat.name;
    document.getElementById("modalAudience").innerHTML = audienceHtml(item);
    document.getElementById("modalTitle").textContent = item.title;
    document.getElementById("modalDate").innerHTML = icon("calendar") + " " + escapeHtml(item.date) +
        (item.expires ? ' <span aria-hidden="true">·</span> ' + icon("clock") + " Expires " + escapeHtml(item.expires) : "");
    document.getElementById("modalDetails").textContent = item.details;
    renderAckBox();

    NeuModal.open(modal, {
        trigger: trigger || document.activeElement,
        initialFocus: "#closeModal",
        onClose: function () {
            // The card that opened this was redrawn (it is no longer "New"): focus its new copy
            if (trigger && !document.contains(trigger)) {
                if (!recoveryModal.hidden) refocus('#recoveryList [data-id="' + id + '"]');
                else refocus('.read-btn[data-id="' + id + '"]');
            }
            openItem = null;
        }
    });

    // Opening an announcement marks it as read
    if (student && !readIds.includes(id)) markRead([id]);
}

// ----- Confirmation: "I have read this" for critical notices -----
const ackBox = document.getElementById("ackBox");
const ackBtn = document.getElementById("ackBtn");

function renderAckBox() {
    const show = !!student && !!openItem && needsAck(openItem);
    ackBox.hidden = !show;
    if (!show) return;

    const done = hasAcked(openItem, student.id);
    ackBtn.setAttribute("aria-pressed", String(done));
    ackBtn.disabled = done;
    ackBtn.className = done ? "btn btn--secondary" : "btn";
    ackBtn.innerHTML = icon("checkcircle") + (done ? " Confirmed" : " I have read this");
    document.getElementById("ackNote").textContent = done
        ? "Thank you. The admin can see that you confirmed this notice."
        : "This is an important notice. Please confirm once you have read it. The admin sees your confirmation.";
}

ackBtn.addEventListener("click", function () {
    if (!student || !openItem || hasAcked(openItem, student.id)) return;
    acknowledge(openItem, student.id);
    renderAckBox();
    refreshViews();
    NeuUI.toast("Confirmed. Thank you.", "success");
    document.getElementById("closeModal").focus();
});

askAbout.addEventListener("click", function () {
    if (openItem) openQuestions(openItem.id, askAbout);
});

// ===== 11. Needs you (recovery) =====
function missedReasons(item) {
    const reasons = [];
    const versions = loadReadVersions(student.id);

    if (isUnread(item)) reasons.push("unread");
    if (needsAck(item) && !hasAcked(item, student.id)) reasons.push("ack");
    if (!isUnread(item) && item.updatedAt && item.updatedAt > (versions[item.id] || 0)) reasons.push("updated");
    if (reasons.length > 0 && isExpired(item)) reasons.push("expired");
    return reasons;
}

// Each reason has a meaning color and an icon, so color is never the only clue
const WHY = {
    unread:  { text: "Unread", cls: "tag--info", icon: "mail" },
    ack:     { text: "Needs your confirmation", cls: "tag--warning", icon: "alert" },
    updated: { text: "Edited since you read it", cls: "tag--primary", icon: "edit" },
    expired: { text: "Expired", cls: "", icon: "clock" }
};

function recoveryItems() {
    const out = [];
    for (let i = 0; i < announcements.length; i++) {
        const item = announcements[i];
        if (!canSee(item)) continue;
        const reasons = missedReasons(item);
        if (reasons.length === 0) continue;
        out.push({ item: item, reasons: reasons });
    }
    return out;
}

function renderRecovery() {
    if (!student) return;

    const all = recoveryItems();
    const badge = document.getElementById("recoveryBadge");
    badge.textContent = all.length;
    badge.hidden = all.length === 0;

    // The card in the side column
    needsCard.hidden = false;
    if (all.length === 0) {
        needsCard.innerHTML = '<div class="panel__body needs__body"><span class="tag tag--success">' + icon("checkcircle") + " All caught up</span>" +
            '<h2 id="needsTitle">Nothing needs you</h2><p>No unread, unconfirmed or changed announcements.</p></div>';
    } else {
        needsCard.innerHTML = '<div class="panel__body needs__body"><span class="tag tag--warning">' + icon("alert") + " " + plural(all.length, "item", "items") + "</span>" +
            '<h2 id="needsTitle">Needs your attention</h2><p>Unread, waiting for your confirmation, or edited since you read them.</p>' +
            '<button type="button" class="btn btn--secondary btn--sm" id="openRecovery">Review ' + all.length + "</button></div>";
    }

    // The pop-up list
    const counts = { all: all.length, university: 0, course: 0 };
    for (let i = 0; i < all.length; i++) {
        counts[audienceOf(all[i].item) === "all" ? "university" : "course"]++;
    }
    const chips = [["all", "All"], ["university", "University-wide"], ["course", "My course"]];
    let toolsHtml = "";
    for (let i = 0; i < chips.length; i++) {
        toolsHtml += '<button type="button" class="chip" data-scope="' + chips[i][0] + '" aria-pressed="' + (recoveryScope === chips[i][0]) + '">' +
            chips[i][1] + '<span class="chip__count">' + counts[chips[i][0]] + "</span></button>";
    }
    document.getElementById("recoveryTools").innerHTML = toolsHtml;

    let html = "";
    let shown = 0;
    for (let i = 0; i < all.length; i++) {
        const item = all[i].item;
        const scope = audienceOf(item) === "all" ? "university" : "course";
        if (recoveryScope !== "all" && recoveryScope !== scope) continue;
        shown++;

        const key = getKey(item);
        const cat = CATEGORIES[key];
        let why = "";
        for (let r = 0; r < all[i].reasons.length; r++) {
            const w = WHY[all[i].reasons[r]];
            why += '<span class="tag ' + w.cls + '">' + icon(w.icon) + " " + w.text + "</span>";
        }

        html += '<button type="button" class="rec-item c-' + key + '" data-id="' + item.id + '">' +
            '<span class="shape-tile" aria-hidden="true"><span class="shape ' + cat.shape + '"></span></span>' +
            '<span class="rec-item__main"><span class="rec-item__why">' + why + "</span>" +
            "<strong>" + escapeHtml(item.title) + "</strong>" +
            '<span class="rec-item__meta">' + cat.name + " · " + escapeHtml(audienceLabel(item)) + " · " + escapeHtml(item.date) + "</span></span>" +
            '<span class="rec-item__go" aria-hidden="true">' + icon("arrowright") + "</span></button>";
    }
    if (shown === 0) {
        html = '<div class="empty"><span class="tag tag--success">' + icon("checkcircle") + " All caught up</span><h3>You are all caught up</h3><p>" +
            (all.length === 0 ? "Nothing unread, unconfirmed or changed." : "Nothing here for this filter. Try All.") + "</p></div>";
    }
    document.getElementById("recoveryList").innerHTML = html;
}

function openRecovery(trigger) {
    if (!student) return;
    renderRecovery();
    NeuModal.open(recoveryModal, { trigger: trigger || document.activeElement });
}

needsCard.addEventListener("click", function (event) {
    const button = event.target.closest("#openRecovery");
    if (button) openRecovery(button);
});
document.getElementById("navRecovery").addEventListener("click", function (event) { openRecovery(event.currentTarget); });

document.getElementById("recoveryTools").addEventListener("click", function (event) {
    const chip = event.target.closest("button");
    if (!chip) return;
    recoveryScope = chip.dataset.scope;
    renderRecovery();
    refocus('#recoveryTools [data-scope="' + recoveryScope + '"]');
});

document.getElementById("recoveryList").addEventListener("click", function (event) {
    const row = event.target.closest(".rec-item");
    if (row) openAnnouncement(Number(row.dataset.id), row);
});

// ===== 12. About pop-up (text comes from ABOUT in data.js) =====
function buildAbout() {
    let steps = "";
    for (let i = 0; i < ABOUT.steps.length; i++) {
        steps += '<li><span class="step-num">' + (i + 1) + "</span><div><strong>" +
            escapeHtml(ABOUT.steps[i][0]) + "</strong><p>" + escapeHtml(ABOUT.steps[i][1]) + "</p></div></li>";
    }

    let geometry = "";
    for (let i = 0; i < categoryKeys.length; i++) {
        const key = categoryKeys[i];
        const c = CATEGORIES[key];
        geometry += '<div class="geo-card c-' + key + '">' +
            '<span class="shape-tile" aria-hidden="true"><span class="shape ' + c.shape + '"></span></span>' +
            "<div><strong>" + capitalize(c.shape) + " · " + c.name + "</strong>" +
            "<p>Area: " + c.area + "</p><p>" + c.perimeterLabel + ": " + c.perimeter + "</p>" +
            '<p class="geo-use">' + c.use + "</p></div></div>";
    }

    let faq = "";
    for (let i = 0; i < ABOUT.faq.length; i++) {
        faq += "<details><summary>" + escapeHtml(ABOUT.faq[i][0]) + "</summary><p>" + escapeHtml(ABOUT.faq[i][1]) + "</p></details>";
    }

    let contacts = "";
    for (let i = 0; i < ABOUT.contacts.length; i++) {
        const c = ABOUT.contacts[i];
        contacts += '<div class="contact-item"><strong>' + escapeHtml(c[0]) + "</strong>" +
            '<a href="mailto:' + escapeHtml(c[1]) + '">' + escapeHtml(c[1]) + "</a>" +
            "<small>" + escapeHtml(c[2]) + "</small></div>";
    }

    const p = ABOUT.project;
    document.getElementById("aboutBody").innerHTML =
        '<p class="about-intro">' + escapeHtml(ABOUT.intro) + "</p>" +
        "<h3>How it works</h3><ol class=\"about-steps\">" + steps + "</ol>" +
        "<h3>The geometry behind NeuCast</h3>" +
        '<p class="about-intro">' + GEOMETRY_INTRO + "</p>" +
        '<div class="geo-grid">' + geometry + "</div>" +
        "<h3>Frequently asked questions</h3>" + faq +
        '<h3 id="contacts">Contact and offices</h3><div class="contact-list">' + contacts + "</div>" +
        "<h3>About the project</h3><div class=\"project-box\">" +
        "<p><strong>Developed by:</strong> " + escapeHtml(p.team) + "</p>" +
        "<p><strong>Course:</strong> " + escapeHtml(p.course) + " · <strong>Adviser:</strong> " + escapeHtml(p.adviser) + "</p>" +
        "<p><strong>School year:</strong> " + escapeHtml(p.year) + " · <strong>Version:</strong> " + escapeHtml(p.version) + "</p></div>";
}

buildAbout();

document.getElementById("navAbout").addEventListener("click", function (event) {
    NeuModal.open(aboutModal, { trigger: event.currentTarget });
});
document.querySelectorAll(".js-about").forEach(function (button) {
    button.addEventListener("click", function () { NeuModal.open(aboutModal, { trigger: button }); });
});

// ===== 13. Settings (saved in this browser) =====
const SETTINGS_KEY = "neucast_settings";
let settings = { theme: "system", textSize: "medium", hideRead: false };

function loadSettings() {
    const saved = NeuTheme.read();
    settings.theme = NeuTheme.prefOf(saved);
    settings.hideRead = saved.hideRead === true;
    if (saved.textSize === "small" || saved.textSize === "large") settings.textSize = saved.textSize;
}

function saveSettings() {
    // "dark" is kept so older pages that only know dark: true/false still work
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
        theme: settings.theme, textSize: settings.textSize, hideRead: settings.hideRead, dark: settings.theme === "dark"
    }));
    NeuTheme.apply(settings);
}

const settingsForm = document.getElementById("settingsForm");
const hideReadToggle = document.getElementById("hideReadToggle");

function openSettings(trigger) {
    settingsForm.querySelector('input[name="theme"][value="' + settings.theme + '"]').checked = true;
    settingsForm.querySelector('input[name="textsize"][value="' + settings.textSize + '"]').checked = true;
    hideReadToggle.checked = settings.hideRead;
    NeuModal.open(settingsModal, { trigger: trigger || document.activeElement });
}

settingsForm.addEventListener("change", function () {
    const theme = settingsForm.querySelector('input[name="theme"]:checked');
    const size = settingsForm.querySelector('input[name="textsize"]:checked');
    if (theme) settings.theme = theme.value;
    if (size) settings.textSize = size.value;
    settings.hideRead = hideReadToggle.checked;
    saveSettings();
    renderCards();
});

document.getElementById("settingsBtn").addEventListener("click", function (event) { openSettings(event.currentTarget); });

// ===== 14. Questions (students ask, the admin answers) =====
const questionAbout = document.getElementById("questionAbout");
const questionText = document.getElementById("questionText");
const questionMessage = document.getElementById("questionMessage");
const myQuestions = document.getElementById("myQuestions");

function updateQuestionBadge() {
    const badge = document.getElementById("questionsBadge");
    const total = student ? countNewReplies(student.id) : 0;
    badge.textContent = total;
    badge.hidden = total === 0;
}

function showQuestionMessage(text, type) {
    questionMessage.textContent = text;
    questionMessage.className = "login-message " + type;
    questionMessage.setAttribute("role", type === "error" ? "alert" : "status");
    questionMessage.hidden = false;
}

function fillQuestionDropdown(chosenId) {
    questionAbout.innerHTML = "";
    questionAbout.add(new Option("General question (not about one announcement)", "0"));
    for (let i = 0; i < announcements.length; i++) {
        if (canSee(announcements[i])) questionAbout.add(new Option(announcements[i].title, announcements[i].id));
    }
    questionAbout.value = String(chosenId);
    if (questionAbout.value !== String(chosenId)) questionAbout.value = "0";
}

function renderMyQuestions() {
    const mine = getStudentQuestions(student.id);
    if (mine.length === 0) {
        myQuestions.innerHTML = '<p class="q-empty">You have not asked any questions yet.</p>';
        return;
    }

    let html = "";
    for (let i = 0; i < mine.length; i++) {
        const q = mine[i];
        const answered = q.answer !== "";

        html += '<article class="q-item"><div class="q-top">' +
            (answered ? '<span class="tag tag--success">' + icon("checkcircle") + " Answered</span>" : '<span class="tag tag--warning">' + icon("clock") + " Waiting for a reply</span>") +
            (answered && !q.seen ? '<span class="tag tag--info">New reply</span>' : "") +
            '<span class="q-date">' + escapeHtml(q.date) + "</span></div>";
        if (q.announcementTitle !== "") html += '<p class="q-about">' + icon("megaphone") + " About: " + escapeHtml(q.announcementTitle) + "</p>";
        html += '<p class="q-text">' + escapeHtml(q.text) + "</p>";
        if (answered) {
            html += '<div class="q-answer"><strong>Reply from the admin</strong><p>' + escapeHtml(q.answer) + "</p><small>" + escapeHtml(q.answerDate) + "</small></div>";
        }
        html += "</article>";
    }
    myQuestions.innerHTML = html;
}

function openQuestions(announcementId, trigger) {
    if (!student) {
        window.location.href = "admin.html#questions";
        return;
    }
    questionMessage.hidden = true;
    questionText.value = "";
    NeuUI.clearErrors(document.getElementById("questionForm"));
    fillQuestionDropdown(announcementId || 0);
    renderMyQuestions();
    NeuModal.open(questionsModal, { trigger: trigger || document.activeElement, initialFocus: "#questionText" });

    // The student has now seen the replies
    markRepliesSeen(student.id);
    updateQuestionBadge();
}

document.getElementById("navQuestions").addEventListener("click", function (event) { openQuestions(0, event.currentTarget); });

document.getElementById("questionForm").addEventListener("submit", function (event) {
    event.preventDefault();
    if (!student) return;
    NeuUI.clearErrors(event.currentTarget);

    const text = questionText.value.trim();
    if (text.length < 5) {
        const message = "Please type your question (at least 5 characters).";
        NeuUI.fieldError(questionText, message);
        showQuestionMessage(message, "error");
        questionText.focus();
        return;
    }

    const chosenId = Number(questionAbout.value);
    let chosen = null;
    for (let i = 0; i < announcements.length; i++) {
        if (announcements[i].id === chosenId) chosen = announcements[i];
    }

    addQuestion(student, text, chosen);

    questionText.value = "";
    questionAbout.value = "0";
    showQuestionMessage("Your question was sent. The admin's reply will appear below.", "success");
    renderMyQuestions();
    NeuUI.toast("Question sent", "success");
});

// ===== 15. Keep up with other devices =====
// cloud.js announces "neucast:synced" when new data arrives. Redraw quietly and keep the viewer's place.
window.addEventListener("neucast:synced", function () {
    announcements = sortPinnedFirst(loadAnnouncements());
    if (student) readIds = loadReadIds(student.id);
    refreshViews();
    updateQuestionBadge();
    if (!questionsModal.hidden && student) renderMyQuestions();
});

// ===== 16. Start =====
loadSettings();
NeuTheme.apply(settings);
updateBell();
renderFilters();
renderRing();
renderCards();
renderRecovery();
updateQuestionBadge();