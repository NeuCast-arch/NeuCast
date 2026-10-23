// ===== 1. Who is viewing the page? =====
const student = getCurrentStudent();
const adminView = isLoggedIn();

if (!student && !adminView) {
    window.location.href = "login.html";
}

const announcements = sortPinnedFirst(loadAnnouncements());

let readIds = [];
if (student) {
    readIds = loadReadIds(student.id);
}

// ===== 2. Page elements =====
const list = document.getElementById("announcementList");
const searchInput = document.getElementById("searchInput");
const noResults = document.getElementById("noResults");
const sideNav = document.getElementById("sideNav");
const readRing = document.getElementById("readRing");
const bellCount = document.getElementById("bellCount");
const markAllBtn = document.getElementById("markAllRead");
const modal = document.getElementById("modal");
const aboutModal = document.getElementById("aboutModal");
const settingsModal = document.getElementById("settingsModal");
const questionsModal = document.getElementById("questionsModal");
const shapeModal = document.getElementById("shapeModal");

// What is selected right now
let activeCategory = "all"; // chosen with the category tiles
let activeSmart = "all";    // chosen with the sidebar quick filters
let activeDate = "";        // chosen with the calendar, like "2026-10-4"
let openItem = null;        // the announcement open in the details pop-up
let shapeKey = "";          // the category open in the shape pop-up, like "urgent"
let shapeTrigger = null;    // the button that opened the shape pop-up (focus goes back to it)

// ===== 3. Top menu and category tiles =====
const NAV = [
    { label: "Home", href: "#top" },
    { label: "Announcements", href: "#announcements", show: true },
    { label: "Recovery", href: "#recovery", recovery: true },
    { label: "Questions", href: "#questions", questions: true },
    { label: "About", href: "#about", about: true },
    { label: "Settings", href: "#settings", settings: true }
];

let navHtml = "";
for (let i = 0; i < NAV.length; i++) {
    const link = NAV[i];
    let classes = "";
    let badge = "";
    if (i === 0) classes += " active";
    if (link.urgent) classes += " js-urgent";
    if (link.about) classes += " js-about";
    if (link.settings) classes += " js-settings";
    if (link.show) classes += " js-show";
    if (link.recovery) {
        if (!student) continue;   // only students have anything to recover
        classes += " js-recovery";
        badge = '<span id="recoveryBadge" class="nav-badge" hidden>0</span>';
    }
    if (link.questions) {
        classes += " js-questions";
        badge = '<span id="questionsBadge" class="nav-badge" hidden>0</span>';
    }
    navHtml += '<a href="' + link.href + '" class="' + classes + '">' + link.label + badge + "</a>";
}
document.querySelector(".topnav").innerHTML = navHtml;

let tilesHtml = "";
const categoryKeys = Object.keys(CATEGORIES);
for (let i = 0; i < categoryKeys.length; i++) {
    const key = categoryKeys[i];
    const c = CATEGORIES[key];
    tilesHtml += '<button class="cat-tile c-' + key + '" data-filter="' + key + '">' +
        '<span class="shape ' + c.shape + '"></span>' +
        "<span><strong>" + c.name + "</strong><small>" + c.desc + "</small></span></button>";
}
document.getElementById("categories").innerHTML = tilesHtml;
const tiles = document.querySelectorAll(".cat-tile");
const heroShapes = document.querySelectorAll(".hero-shape");   // the big shapes in the hero

// ===== 4. Header and student bar =====
if (student) {
    document.getElementById("userName").textContent = "Hello, " + student.name.split(" ")[0];
    document.getElementById("userSub").textContent = student.course + " · " + student.year;
    document.getElementById("userLink").href = "profile.html";

    document.getElementById("studentName").innerHTML = icon("user") + " " + escapeHtml(student.name);
    document.getElementById("studentInfo").textContent =
        student.course + " · " + student.year + " · ID " + student.id;

    document.getElementById("studentAction").addEventListener("click", function () {
        studentLogOut();
        window.location.href = "login.html";
    });
} else {
    document.getElementById("userName").textContent = "Hello, Admin";
    document.getElementById("userSub").textContent = "Open dashboard";
    document.getElementById("userLink").href = "admin.html";

    document.getElementById("studentName").innerHTML = icon("shield") + " Admin preview";
    document.getElementById("studentInfo").textContent = "Showing every announcement, for all courses.";

    document.getElementById("studentAction").textContent = "Back to Dashboard";
    document.getElementById("studentAction").addEventListener("click", function () {
        window.location.href = "admin.html";
    });

    markAllBtn.hidden = true;
}

// ===== 5. Rules: who can see what =====

// Students see university-wide announcements and their own course's. Admin sees all.
function canSee(item) {
    if (adminView) return true;
    if (!student) return false;

    const audience = audienceOf(item);
    if (audience === "all") return true;
    if (audience === student.course) return true;
    return false;
}

function isUnread(item) {
    if (!student) return false;
    return !readIds.includes(item.id);
}

function getCourseName(code) {
    for (let i = 0; i < COURSES.length; i++) {
        if (COURSES[i].code === code) return COURSES[i].name;
    }
    return code;
}

// Turns a date into text like "2026-10-4" so two dates can be compared
function dateKey(date) {
    return date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate();
}

// ===== 6. Sidebar quick filters =====
const SMART_FILTERS = [
    { name: "all", label: "All", icon: "list", studentOnly: false, group: "view" },
    { name: "unread", label: "Unread", icon: "mail", studentOnly: true, group: "view" },
    { name: "pinned", label: "Pinned", icon: "pin", studentOnly: false, group: "view" },
    { name: "urgent", label: "Urgent", icon: "alert", studentOnly: false, group: "view" },
    { name: "university", label: "University-wide", icon: "globe", studentOnly: false, group: "scope" },
    { name: "course", label: "My course", icon: "cap", studentOnly: true, group: "scope" }
];

function matchesSmart(item, name) {
    if (name === "unread") return isUnread(item);
    if (name === "pinned") return item.pinned === true;
    if (name === "urgent") return getKey(item) === "urgent";
    if (name === "course") return audienceOf(item) !== "all";
    if (name === "university") return audienceOf(item) === "all";
    return true; // "all"
}

function countSmart(name) {
    let count = 0;
    for (let i = 0; i < announcements.length; i++) {
        if (canSee(announcements[i]) && matchesSmart(announcements[i], name)) {
            count++;
        }
    }
    return count;
}

// How many announcements this viewer can see, and how many of those are read
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

// "1 of 2 confirmations done" for the critical notices this student must confirm
function ackProgressHtml() {
    let total = 0;
    let done = 0;
    for (let i = 0; i < announcements.length; i++) {
        const item = announcements[i];
        if (!canSee(item) || !needsAck(item)) continue;
        total++;
        if (hasAcked(item, student.id)) done++;
    }
    if (total === 0) return "";
    return '<span class="ring-ack">' + done + " of " + total + " confirmations done</span>";
}

// The progress ring is a circle drawn with its circumference: C = 2πr.
// The coloured part of the ring is C × (read ÷ total) long.
const RING_RADIUS = 24;

function ringHtml() {
    const counts = countRead();
    const circumference = 2 * Math.PI * RING_RADIUS;
    const fraction = counts.total === 0 ? 0 : counts.read / counts.total;
    const filled = circumference * fraction;

    const hint = "Ring length = C × (read ÷ total) = " + circumference.toFixed(2) + " × " +
        fraction.toFixed(2) + " = " + filled.toFixed(2);

    let headline = counts.read + " of " + counts.total;
    if (counts.total === 0) headline = "Nothing yet";

    return '<button class="read-ring" data-smart="unread" title="' + hint + '">' +
        '<svg viewBox="0 0 64 64" aria-hidden="true">' +
        '<circle class="ring-track" cx="32" cy="32" r="' + RING_RADIUS + '"/>' +
        '<circle class="ring-fill" cx="32" cy="32" r="' + RING_RADIUS + '" transform="rotate(-90 32 32)" ' +
        'stroke-dasharray="' + filled.toFixed(2) + " " + circumference.toFixed(2) + '"/>' +
        '<circle class="ring-edge" cx="32" cy="32" r="30"/><circle class="ring-edge" cx="32" cy="32" r="18"/></svg>' +
        "<span><strong>" + headline + "</strong><small>announcements read</small>" +
        "<em>C = 2πr = " + circumference.toFixed(2) + "</em>" + ackProgressHtml() + "</span></button>";
}

// The quick filters are chips above the announcement list.
// The reading-progress ring lives in the right panel.
function renderSidebar() {
    const groups = { view: "", scope: "" };

    for (let i = 0; i < SMART_FILTERS.length; i++) {
        const filter = SMART_FILTERS[i];
        if (filter.studentOnly && !student) continue;

        let classes = "nb-chip smart-link";
        if (filter.name === activeSmart) classes += " is-active";

        groups[filter.group] += '<button type="button" class="' + classes + '" data-smart="' + filter.name + '"' +
            ' aria-pressed="' + (filter.name === activeSmart) + '">' +
            icon(filter.icon) + filter.label +
            '<span class="nb-chip__count">' + countSmart(filter.name) + "</span></button>";
    }

    sideNav.innerHTML =
        '<div class="filter-group"><span class="filter-label">Show</span>' + groups.view + "</div>" +
        '<div class="filter-group"><span class="filter-label">Scope</span>' + groups.scope + "</div>";

    readRing.innerHTML = student ? ringHtml() : "";
}

readRing.addEventListener("click", function (event) {
    if (event.target.closest("button")) chooseSmart("unread");
});

// One click listener for every button in the sidebar
sideNav.addEventListener("click", function (event) {
    // closest() finds the button even if the click landed on the icon or number inside it
    const button = event.target.closest("button");
    if (!button) return;

    if (button.id === "openSettings") {
        openSettings();
    } else if (button.id === "openQuestions") {
        openQuestions(0);
    } else {
        chooseSmart(button.dataset.smart);
    }
});

function chooseSmart(name) {
    activeSmart = name;
    activeDate = "";
    searchInput.value = "";
    setCategory("all");
    renderSidebar();
    renderCalendar();
    scrollToList();
}

// ===== 7. Show the announcement cards =====
function renderCards() {
    const searchText = searchInput.value.toLowerCase().trim();
    let shown = 0;
    let html = "";

    for (let i = 0; i < announcements.length; i++) {
        const item = announcements[i];
        const key = getKey(item);

        if (!canSee(item)) continue;
        if (activeCategory !== "all" && key !== activeCategory) continue;
        if (!matchesSmart(item, activeSmart)) continue;
        if (settings.hideRead && student && !isUnread(item)) continue;
        if (activeDate !== "" && dateKey(new Date(item.date)) !== activeDate) continue;

        const inTitle = item.title.toLowerCase().includes(searchText);
        const inDetails = item.details.toLowerCase().includes(searchText);
        if (!inTitle && !inDetails) continue;

        shown++;

        const cat = CATEGORIES[key];
        let preview = item.details;
        if (preview.length > 100) {
            preview = preview.slice(0, 100) + "...";
        }

        let classes = "card nb-card nb-card--lift c-" + key;
        if (item.pinned) classes += " pinned";
        if (isUnread(item)) classes += " unread";

        html += '<article class="' + classes + '">' +
            '<div class="card-top">' +
            '<span class="shape sm ' + cat.shape + '"></span>' +
            '<span class="badge">' + cat.name.toUpperCase() + "</span>";
        if (isUnread(item)) html += '<span class="new-tag">NEW</span>';
        if (item.pinned) html += '<span class="pin-tag">' + icon("pin") + " Pinned</span>";
        html += '<span class="audience">' + audienceHtml(item) + "</span></div>" +
            "<h3>" + escapeHtml(item.title) + "</h3>" +
            "<p>" + escapeHtml(preview) + "</p>" +
            '<div class="card-foot"><span class="date">' + icon("calendar") + " " + escapeHtml(item.date) + "</span>" +
            '<button class="read-btn nb-btn nb-btn--secondary nb-btn--sm" data-id="' + item.id + '">Read More</button></div></article>';
    }

    list.innerHTML = html;
    noResults.hidden = shown > 0;
}

// The bell counts urgent announcements the student has not read yet
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
}

function setCategory(name) {
    activeCategory = name;
    tiles.forEach(function (tile) {
        tile.classList.toggle("active", tile.dataset.filter === name);
    });
    heroShapes.forEach(function (shape) {
        shape.classList.toggle("active", shape.dataset.filter === name);
    });
    renderCards();
}

// The announcements stay hidden until the viewer picks a shape (or searches, or uses a filter)
const announcementArea = document.getElementById("announcementArea");
const shapePrompt = document.getElementById("shapePrompt");

function showAnnouncements() {
    announcementArea.hidden = false;
    shapePrompt.hidden = true;
}

function scrollToList() {
    showAnnouncements();
    document.getElementById("announcements").scrollIntoView({ behavior: "smooth" });
}

// The panel shown instead of the list: one big button for each shape
function renderShapePrompt() {
    let html = "";
    for (let i = 0; i < categoryKeys.length; i++) {
        const key = categoryKeys[i];
        const c = CATEGORIES[key];
        const total = countNotices(key);

        html += '<button type="button" class="prompt-shape c-' + key + '" data-key="' + key + '">' +
            '<span class="shape ' + c.shape + '"></span><strong>' + c.name + "</strong>" +
            "<small>" + total + (total === 1 ? " notice" : " notices") + "</small></button>";
    }

    shapePrompt.innerHTML = "<h2>Pick a shape to see the announcements</h2>" +
        "<p>Every shape is a category. Click one to open its announcements.</p>" +
        '<div class="prompt-shapes">' + html + "</div>";
}

shapePrompt.addEventListener("click", function (event) {
    const button = event.target.closest("button");
    if (!button) return;

    shapeTrigger = button;
    openShapePopup(button.dataset.key);
});

// ----- Shape pop-up: the announcements of one category, opened from the panel above -----
const shapeBox = document.getElementById("shapeBox");
const shapeBody = document.getElementById("shapeBody");

function openShapePopup(key) {
    shapeKey = key;
    renderShapePopup();
    shapeBody.scrollTop = 0;
    shapeModal.hidden = false;
    document.getElementById("shapeBack").focus();
}

// Closes any pop-up. The shape pop-up also hands focus back to the shape that opened it.
function closePopup(popup) {
    popup.hidden = true;
    if (popup === shapeModal && shapeTrigger) {
        shapeTrigger.focus();
    }
}

function renderShapePopup() {
    const cat = CATEGORIES[shapeKey];
    const items = [];
    let unread = 0;

    for (let i = 0; i < announcements.length; i++) {
        const item = announcements[i];
        if (!canSee(item) || getKey(item) !== shapeKey) continue;
        if (settings.hideRead && student && !isUnread(item)) continue;
        items.push(item);
        if (isUnread(item)) unread++;
    }

    // The header takes its color from the category (c-<key> sets --c and --on-c)
    shapeBox.className = "modal-content nb-modal__content shape-modal c-" + shapeKey;
    document.getElementById("shapeIcon").className = "shape " + cat.shape;
    document.getElementById("shapeTitle").textContent = cat.name;
    const noun = items.length === 1 ? "notice" : "notices";
    document.getElementById("shapeDesc").innerHTML = escapeHtml(cat.desc) +
        ' <span class="sm-tag sm-tag--count">' + items.length + " " + noun + "</span>" +   // phones only (see CSS)
        (unread > 0 ? ' <span class="sm-tag">' + unread + " new</span>" : "");
    document.getElementById("shapeCount").innerHTML = "<b>" + items.length + "</b><small>" + noun + "</small>";

    document.getElementById("shapeFoot").hidden = items.length === 0;   // nothing to open in the full list

    if (items.length === 0) {
        shapeBody.innerHTML = '<p class="sm-empty">No ' + escapeHtml(cat.name) + " announcements right now" +
            "<small>Check back later, or pick another shape.</small></p>";
        return;
    }

    let html = "";
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        let tags = "";
        if (isUnread(item)) tags += '<span class="sm-tag sm-tag--new">New</span>';
        if (item.pinned) tags += '<span class="sm-tag sm-tag--pin">' + icon("pin") + " Pinned</span>";
        tags += '<span class="sm-tag sm-tag--aud">' + audienceHtml(item) + "</span>";

        html += '<button type="button" class="sm-item" data-id="' + item.id + '">' +
            '<span class="sm-item__shape"><span class="shape sm ' + cat.shape + '"></span></span>' +
            '<span class="sm-item__main">' +
            '<span class="sm-item__tags">' + tags + "</span>" +
            "<strong>" + escapeHtml(item.title) + "</strong>" +
            '<span class="sm-item__text">' + escapeHtml(item.details) + "</span>" +
            '<span class="sm-item__date">' + icon("calendar") + " " + escapeHtml(item.date) + "</span>" +
            "</span>" +
            '<span class="sm-item__go">' + icon("arrowright") + "</span></button>";
    }
    shapeBody.innerHTML = html;
}

// Picking an announcement opens its details on top of this pop-up
shapeBody.addEventListener("click", function (event) {
    const row = event.target.closest(".sm-item");
    if (row) openAnnouncement(Number(row.dataset.id));
});

// "Back to shapes" and the X both return to the panel behind the pop-up
document.getElementById("shapeBack").addEventListener("click", function () {
    closePopup(shapeModal);
});
document.getElementById("closeShape").addEventListener("click", function () {
    closePopup(shapeModal);
});

// "Open full list" leaves the pop-up and shows this category in the main list
document.getElementById("shapeOpenAll").addEventListener("click", function () {
    const key = shapeKey;
    shapeModal.hidden = true;
    setCategory(key);
    scrollToList();
});

// The Announcements link in the top menu opens the list too
document.querySelectorAll(".js-show").forEach(function (link) {
    link.addEventListener("click", showAnnouncements);
});

function markRead(ids) {
    for (let i = 0; i < ids.length; i++) {
        if (!readIds.includes(ids[i])) {
            readIds.push(ids[i]);
        }
    }
    saveReadIds(student.id, readIds);
    for (let i = 0; i < announcements.length; i++) {
        if (ids.includes(announcements[i].id)) saveReadVersion(student.id, announcements[i]);
    }
    updateBell();
    renderRecovery();
    renderSidebar();
    renderCards();
    if (!shapeModal.hidden) renderShapePopup();   // refresh NEW tags in the shape pop-up
}

// ===== Recovery Center: everything this student may have missed =====
const recovery = document.getElementById("recovery");
let recoveryScope = "all";   // all, university, or course

// Why is this announcement here? An announcement can have several reasons.
function missedReasons(item) {
    const reasons = [];
    const versions = loadReadVersions(student.id);

    if (isUnread(item)) reasons.push("unread");
    if (needsAck(item) && !hasAcked(item, student.id)) reasons.push("ack");
    if (!isUnread(item) && item.updatedAt && item.updatedAt > (versions[item.id] || 0)) reasons.push("updated");
    if (reasons.length > 0 && isExpired(item)) reasons.push("expired");
    return reasons;
}

const WHY = {
    unread: "Unread",
    ack: "Needs your confirmation",
    updated: "Edited since you read it",
    expired: "Expired"
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
    if (!student) return;   // admin preview has nothing to recover
    recovery.hidden = false;

    const all = recoveryItems();
    const badge = document.getElementById("recoveryBadge");
    document.getElementById("recoveryCount").textContent = all.length;
    if (badge) {
        badge.textContent = all.length;
        badge.hidden = all.length === 0;
    }

    // Scope chips: all, university-wide, my course
    const counts = { all: all.length, university: 0, course: 0 };
    for (let i = 0; i < all.length; i++) {
        counts[audienceOf(all[i].item) === "all" ? "university" : "course"]++;
    }
    const chips = [["all", "All", "list"], ["university", "University-wide", "globe"], ["course", "My course", "cap"]];
    let toolsHtml = "";
    for (let i = 0; i < chips.length; i++) {
        const c = chips[i];
        toolsHtml += '<button type="button" class="nb-chip' + (recoveryScope === c[0] ? " is-active" : "") + '" data-scope="' + c[0] +
            '" aria-pressed="' + (recoveryScope === c[0]) + '">' + icon(c[2]) + c[1] + '<span class="nb-chip__count">' + counts[c[0]] + "</span></button>";
    }
    document.getElementById("recoveryTools").innerHTML = toolsHtml;

    let html = "";
    let shown = 0;
    for (let i = 0; i < all.length; i++) {
        const item = all[i].item;
        const scope = audienceOf(item) === "all" ? "university" : "course";
        if (recoveryScope !== "all" && recoveryScope !== scope) continue;
        shown++;

        const cat = CATEGORIES[getKey(item)];
        let why = "";
        for (let r = 0; r < all[i].reasons.length; r++) {
            const key = all[i].reasons[r];
            const shape = key === "ack" ? "hexagon" : key === "updated" ? "square" : key === "expired" ? "triangle" : "circle";
            why += '<span class="why why--' + key + '"><span class="shape ' + shape + '" aria-hidden="true"></span>' + WHY[key] + "</span>";
        }

        html += '<button type="button" class="rec-item c-' + getKey(item) + '" data-id="' + item.id + '">' +
            '<span class="rec-item__shape"><span class="shape sm ' + cat.shape + '" aria-hidden="true"></span></span>' +
            '<span class="rec-item__main"><span class="rec-item__why">' + why + "</span>" +
            "<strong>" + escapeHtml(item.title) + "</strong>" +
            '<span class="rec-item__meta">' + cat.name + " · " + escapeHtml(audienceLabel(item)) + " · " + escapeHtml(item.date) + "</span></span>" +
            '<span class="rec-item__go" aria-hidden="true">' + icon("arrowright") + "</span></button>";
    }

    if (shown === 0) {
        html = '<div class="recovery__empty"><strong>You are all caught up</strong>' +
            (all.length === 0 ? "Nothing unread, unconfirmed or changed." : "Nothing here for this filter. Try All.") + "</div>";
    }
    document.getElementById("recoveryList").innerHTML = html;
}

document.getElementById("recoveryTools").addEventListener("click", function (event) {
    const chip = event.target.closest("button");
    if (!chip) return;
    recoveryScope = chip.dataset.scope;
    renderRecovery();
});

document.getElementById("recoveryList").addEventListener("click", function (event) {
    const row = event.target.closest(".rec-item");
    if (row) openAnnouncement(Number(row.dataset.id));
});

document.querySelectorAll(".js-recovery").forEach(function (link) {
    link.addEventListener("click", function (event) {
        event.preventDefault();
        recovery.open = true;
        recovery.scrollIntoView({ behavior: "smooth", block: "start" });
    });
});

// ===== 8. Buttons: search, tiles, View All, Mark all, bell =====
searchInput.addEventListener("input", function () {
    if (searchInput.value.trim() !== "") showAnnouncements();
    renderCards();
});

document.getElementById("searchBtn").addEventListener("click", function () {
    renderCards();
    scrollToList();
});

tiles.forEach(function (tile) {
    tile.addEventListener("click", function () {
        // Clicking the selected tile again shows everything
        if (activeCategory === tile.dataset.filter) {
            setCategory("all");
        } else {
            setCategory(tile.dataset.filter);
        }
        scrollToList();
    });
});

// The shapes in the hero do the same job as the category tiles
heroShapes.forEach(function (shape) {
    shape.addEventListener("click", function () {
        if (activeCategory === shape.dataset.filter) {
            setCategory("all");
        } else {
            setCategory(shape.dataset.filter);
        }
        scrollToList();
    });
});

document.getElementById("viewAll").addEventListener("click", function () {
    showAnnouncements();
    searchInput.value = "";
    activeSmart = "all";
    activeDate = "";
    setCategory("all");
    renderSidebar();
    renderCalendar();
});

// "Back to shapes" clears every filter and shows the "Pick a shape" panel again
document.getElementById("backToShapes").addEventListener("click", function () {
    searchInput.value = "";
    activeSmart = "all";
    activeDate = "";
    setCategory("all");
    renderSidebar();
    renderCalendar();
    announcementArea.hidden = true;
    shapePrompt.hidden = false;
    shapePrompt.scrollIntoView({ behavior: "smooth", block: "center" });
});

markAllBtn.addEventListener("click", function () {
    if (!student) return;
    const ids = [];
    for (let i = 0; i < announcements.length; i++) {
        if (canSee(announcements[i])) {
            ids.push(announcements[i].id);
        }
    }
    markRead(ids);
});

// The bell and the Notifications link show only urgent announcements
const urgentButtons = document.querySelectorAll("#bellBtn, .js-urgent");
urgentButtons.forEach(function (button) {
    button.addEventListener("click", function (event) {
        event.preventDefault();
        chooseSmart("urgent");
    });
});

// ===== 9. Announcement details pop-up =====
const askAbout = document.getElementById("askAbout");

list.addEventListener("click", function (event) {
    if (!event.target.classList.contains("read-btn")) return;
    openAnnouncement(Number(event.target.dataset.id));
});

// Opens the details pop-up for one announcement (used by the cards and the shape pop-up)
function openAnnouncement(id) {
    let item = null;
    for (let i = 0; i < announcements.length; i++) {
        if (announcements[i].id === id) item = announcements[i];
    }
    if (!item) return;

    openItem = item;
    askAbout.hidden = !student;   // only students can ask questions

    const key = getKey(item);
    document.getElementById("modalBadge").textContent = CATEGORIES[key].name.toUpperCase();
    document.getElementById("modalBadge").className = "badge c-" + key;
    document.getElementById("modalTitle").textContent = item.title;
    document.getElementById("modalDate").innerHTML =
        icon("calendar") + " " + escapeHtml(item.date) + " &nbsp;·&nbsp; " + audienceHtml(item);
    document.getElementById("modalDetails").textContent = item.details;
    modal.hidden = false;
    renderAckBox();

    // Opening an announcement marks it as read
    if (student && !readIds.includes(id)) {
        markRead([id]);
    }
}

// ===== Acknowledgment: the hexagon "I have read this" button =====
const ackBox = document.getElementById("ackBox");
const ackBtn = document.getElementById("ackBtn");

function renderAckBox() {
    const show = !!student && !!openItem && needsAck(openItem);
    ackBox.hidden = !show;
    if (!show) return;

    const done = hasAcked(openItem, student.id);
    ackBtn.setAttribute("aria-pressed", String(done));
    ackBtn.disabled = done;
    document.getElementById("ackNote").textContent = done ? "You confirmed this notice." : "This is a critical notice. Please confirm once you have read it.";
    document.getElementById("ackLabel").textContent = done ? "Confirmed" : "I have read this";
    document.getElementById("ackSub").textContent = done ? "Thank you. The admin can see this." : "Tap to confirm. The admin sees your answer.";
}

ackBtn.addEventListener("click", function () {
    if (!student || !openItem || hasAcked(openItem, student.id)) return;
    acknowledge(openItem, student.id);
    renderAckBox();
    renderSidebar();
    renderRecovery();
});

// "Ask a question about this" opens the Questions pop-up with this announcement chosen
askAbout.addEventListener("click", function () {
    if (openItem) {
        openQuestions(openItem.id);
    }
});

document.getElementById("closeModal").addEventListener("click", function () {
    modal.hidden = true;
});

// ===== 10. About pop-up (the text comes from ABOUT in data.js) =====

// Makes the first letter a capital: "circle" becomes "Circle"
function capitalize(word) {
    return word.charAt(0).toUpperCase() + word.slice(1);
}

function buildAbout() {
    let steps = "";
    for (let i = 0; i < ABOUT.steps.length; i++) {
        steps += '<li><span class="step-num">' + (i + 1) + "</span><div><strong>" +
            escapeHtml(ABOUT.steps[i][0]) + "</strong><p>" + escapeHtml(ABOUT.steps[i][1]) + "</p></div></li>";
    }

    // The Geometry Behind NeuCast: one card for each shape
    let geometry = "";
    for (let i = 0; i < categoryKeys.length; i++) {
        const key = categoryKeys[i];
        const c = CATEGORIES[key];
        geometry += '<div class="geo-card c-' + key + '">' +
            '<span class="shape ' + c.shape + '"></span>' +
            "<strong>" + capitalize(c.shape) + "</strong>" +
            '<span class="geo-cat">' + c.name + "</span>" +
            "<p><b>Area:</b> " + c.area + "</p>" +
            "<p><b>" + c.perimeterLabel + ":</b> " + c.perimeter + "</p>" +
            '<p class="geo-use">' + c.use + "</p></div>";
    }

    let faq = "";
    for (let i = 0; i < ABOUT.faq.length; i++) {
        faq += "<details><summary>" + escapeHtml(ABOUT.faq[i][0]) + "</summary><p>" +
            escapeHtml(ABOUT.faq[i][1]) + "</p></details>";
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
        "<h2>About NeuCast</h2>" +
        '<p class="about-intro">' + escapeHtml(ABOUT.intro) + "</p>" +
        '<h3>How it works</h3><ol class="about-steps">' + steps + "</ol>" +
        "<h3>The Geometry Behind NeuCast</h3>" +
        '<p class="about-intro">' + GEOMETRY_INTRO + "</p>" +
        '<div class="geo-grid">' + geometry + "</div>" +
        "<h3>Frequently asked questions</h3>" + faq +
        '<h3>Contact and offices</h3><div class="contact-list">' + contacts + "</div>" +
        '<h3>About the project</h3><div class="project-box">' +
        "<p><strong>Developed by:</strong> " + escapeHtml(p.team) + "</p>" +
        "<p><strong>Course:</strong> " + escapeHtml(p.course) + " · <strong>Adviser:</strong> " + escapeHtml(p.adviser) + "</p>" +
        "<p><strong>School year:</strong> " + escapeHtml(p.year) + " · <strong>Version:</strong> " + escapeHtml(p.version) + "</p></div>";
}

buildAbout();

document.querySelectorAll(".js-about").forEach(function (link) {
    link.addEventListener("click", function (event) {
        event.preventDefault();
        aboutModal.hidden = false;
    });
});

document.getElementById("closeAbout").addEventListener("click", function () {
    aboutModal.hidden = true;
});

// ===== 11. Settings (saved in this browser) =====
const SETTINGS_KEY = "neucast_settings";
let settings = { dark: false, textSize: "medium", hideRead: false };

function loadSettings() {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (!saved) return;

    try {
        const data = JSON.parse(saved);
        settings.dark = data.dark === true;
        settings.hideRead = data.hideRead === true;
        if (data.textSize === "small" || data.textSize === "large") {
            settings.textSize = data.textSize;
        }
    } catch (error) {
        // Damaged settings: keep the defaults
    }
}

function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function applySettings() {
    document.body.classList.toggle("dark", settings.dark);
    document.body.classList.remove("text-small", "text-large");
    if (settings.textSize === "small") document.body.classList.add("text-small");
    if (settings.textSize === "large") document.body.classList.add("text-large");
}

const darkToggle = document.getElementById("darkToggle");
const textSizeSelect = document.getElementById("textSizeSelect");
const hideReadToggle = document.getElementById("hideReadToggle");

function openSettings() {
    darkToggle.checked = settings.dark;
    textSizeSelect.value = settings.textSize;
    hideReadToggle.checked = settings.hideRead;
    settingsModal.hidden = false;
}

function settingsChanged() {
    settings.dark = darkToggle.checked;
    settings.textSize = textSizeSelect.value;
    settings.hideRead = hideReadToggle.checked;
    saveSettings();
    applySettings();
    renderCards();
}

darkToggle.addEventListener("change", settingsChanged);
textSizeSelect.addEventListener("change", settingsChanged);
hideReadToggle.addEventListener("change", settingsChanged);

document.getElementById("closeSettings").addEventListener("click", function () {
    settingsModal.hidden = true;
});

// The Settings link in the top menu (it used to be in the sidebar)
document.querySelectorAll(".js-settings").forEach(function (link) {
    link.addEventListener("click", function (event) {
        event.preventDefault();
        openSettings();
    });
});

// ===== Campus Information by Shape (right panel) =====

// Counts the announcements in one category that this viewer can see
function countNotices(key) {
    let count = 0;
    for (let i = 0; i < announcements.length; i++) {
        if (canSee(announcements[i]) && getKey(announcements[i]) === key) {
            count++;
        }
    }
    return count;
}

// Draws one row for each shape: the shape, the notice count, and the area formula
function renderShapeInfo() {
    let html = "";

    for (let i = 0; i < categoryKeys.length; i++) {
        const key = categoryKeys[i];
        const cat = CATEGORIES[key];
        const total = countNotices(key);

        let word = " notices";
        if (total === 1) word = " notice";

        html += '<button class="shape-row c-' + key + '" data-key="' + key + '">' +
            '<span class="shape ' + cat.shape + '"></span>' +
            '<span class="shape-text"><strong>' + cat.name + "</strong>" +
            "<small>" + total + word + "</small>" +
            "<em>" + cat.area + "</em></span></button>";
    }

    document.getElementById("shapeList").innerHTML = html;
}

// Writes the category name and notice count inside each big hero shape
function renderHeroShapes() {
    heroShapes.forEach(function (shape) {
        const key = shape.dataset.filter;
        shape.innerHTML = '<span class="hs-label"><b>' + CATEGORIES[key].name + "</b><small>" +
            countNotices(key) + "</small></span>";
    });
}

// Clicking a row shows only that category, like clicking its tile
document.getElementById("shapeList").addEventListener("click", function (event) {
    const row = event.target.closest("button");
    if (!row) return;

    setCategory(row.dataset.key);
    scrollToList();
});

// ===== Questions (students ask, the admin answers) =====
const questionAbout = document.getElementById("questionAbout");
const questionText = document.getElementById("questionText");
const questionMessage = document.getElementById("questionMessage");
const myQuestions = document.getElementById("myQuestions");

// The red number on the Questions menu link: replies the student has not seen
function updateQuestionBadge() {
    const badge = document.getElementById("questionsBadge");
    if (!badge) return;

    let total = 0;
    if (student) {
        total = countNewReplies(student.id);
    }

    badge.textContent = total;
    badge.hidden = total === 0;
}

function showQuestionMessage(text, type) {
    questionMessage.textContent = text;
    questionMessage.className = "q-message " + type;
    questionMessage.hidden = false;
}

// Fills the "Related announcement" dropdown with the announcements this student can see
function fillQuestionDropdown(chosenId) {
    questionAbout.innerHTML = "";
    questionAbout.add(new Option("General question (not about one announcement)", "0"));

    for (let i = 0; i < announcements.length; i++) {
        if (canSee(announcements[i])) {
            questionAbout.add(new Option(announcements[i].title, announcements[i].id));
        }
    }

    questionAbout.value = String(chosenId);
    if (questionAbout.value !== String(chosenId)) {
        questionAbout.value = "0";   // that announcement is not in the list
    }
}

// Draws the student's own questions with the admin's replies
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

        let status = '<span class="q-status pending">Pending</span>';
        if (answered) {
            status = '<span class="q-status answered">Answered</span>';
        }

        let newTag = "";
        if (answered && !q.seen) {
            newTag = '<span class="q-new">NEW REPLY</span>';
        }

        html += '<article class="q-item"><div class="q-top">' + status + newTag +
            '<span class="q-date">' + escapeHtml(q.date) + "</span></div>";

        if (q.announcementTitle !== "") {
            html += '<p class="q-about">' + icon("megaphone") + " About: " + escapeHtml(q.announcementTitle) + "</p>";
        }

        html += '<p class="q-text">' + escapeHtml(q.text) + "</p>";

        if (answered) {
            html += '<div class="q-answer"><strong>Reply from the admin</strong><p>' +
                escapeHtml(q.answer) + "</p><small>" + escapeHtml(q.answerDate) + "</small></div>";
        }

        html += "</article>";
    }

    myQuestions.innerHTML = html;
}

// Opens the Questions pop-up. announcementId is 0 for a general question.
function openQuestions(announcementId) {
    // The admin has no questions of their own: send them to the dashboard
    if (!student) {
        window.location.href = "admin.html#questions";
        return;
    }

    modal.hidden = true;   // close the details pop-up if it is open
    questionMessage.hidden = true;
    questionText.value = "";
    fillQuestionDropdown(announcementId);
    renderMyQuestions();
    questionsModal.hidden = false;

    // The student has now seen the replies, so the red numbers go away
    markRepliesSeen(student.id);
    updateQuestionBadge();
renderRecovery();
    renderSidebar();
}

// Send a question
document.getElementById("questionForm").addEventListener("submit", function (event) {
    event.preventDefault();
    if (!student) return;

    const text = questionText.value.trim();

    if (text.length < 5) {
        showQuestionMessage("Please type your question (at least 5 characters).", "error");
        return;
    }

    // Find the announcement the student picked (if any)
    const chosenId = Number(questionAbout.value);
    let chosen = null;
    for (let i = 0; i < announcements.length; i++) {
        if (announcements[i].id === chosenId) {
            chosen = announcements[i];
        }
    }

    addQuestion(student, text, chosen);

    questionText.value = "";
    questionAbout.value = "0";
    showQuestionMessage("Your question was sent. The admin's reply will appear below.", "success");
    renderMyQuestions();
});

// The Questions link in the top menu
document.querySelectorAll(".js-questions").forEach(function (link) {
    link.addEventListener("click", function (event) {
        event.preventDefault();
        openQuestions(0);
    });
});

document.getElementById("closeQuestions").addEventListener("click", function () {
    questionsModal.hidden = true;
});

// ===== 12. Close pop-ups =====
// Clicking the dark background closes a pop-up
const popups = [shapeModal, modal, aboutModal, settingsModal, questionsModal];
popups.forEach(function (popup) {
    popup.addEventListener("click", function (event) {
        if (event.target === popup) closePopup(popup);
    });
});

// The Escape key closes the pop-ups. If announcement details sit on top of the
// shape pop-up, the first press closes only the details, so you land back on the list.
document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;

    if (!modal.hidden && !shapeModal.hidden) {
        modal.hidden = true;
        return;
    }
    popups.forEach(function (popup) {
        if (!popup.hidden) closePopup(popup);
    });
});

// ===== Geometry Calculator (right panel) =====
// Every shape lists: its measurements as [id, label], how to work out the area and perimeter,
// the steps to show (work), and the box the preview is drawn in (in units).
// The four category shapes take their formula text from CATEGORIES in data.js.
// The other four write their own text here.
const SHAPE_ORDER = ["circle", "square", "rectangle", "triangle", "parallelogram", "trapezoid", "pentagon", "hexagon"];

const SHAPE_MATH = {
    circle: {
        inputs: [["r", "Radius (r)"]],
        area: v => Math.PI * v.r * v.r,
        perimeter: v => 2 * Math.PI * v.r,
        areaWork: v => ["π × " + v.r + "²"],
        perimWork: v => ["2 × π × " + v.r],
        box: v => [2 * v.r, 2 * v.r]
    },
    square: {
        inputs: [["s", "Side (s)"]],
        area: v => v.s * v.s,
        perimeter: v => 4 * v.s,
        areaWork: v => [v.s + "²"],
        perimWork: v => ["4 × " + v.s],
        box: v => [v.s, v.s]
    },
    rectangle: {
        areaText: "A = l × w", perimText: "P = 2(l + w)", perimLabel: "Perimeter",
        inputs: [["l", "Length (l)"], ["w", "Width (w)"]],
        area: v => v.l * v.w,
        perimeter: v => 2 * (v.l + v.w),
        areaWork: v => [v.l + " × " + v.w],
        perimWork: v => ["2 × (" + v.l + " + " + v.w + ")"],
        box: v => [v.l, v.w]
    },
    triangle: {
        // An isosceles triangle: the two equal sides come from the base and the height
        note: "Isosceles triangle: the equal sides come from b and h.",
        inputs: [["b", "Base (b)"], ["h", "Height (h)"]],
        area: v => 0.5 * v.b * v.h,
        perimeter: v => v.b + 2 * Math.sqrt((v.b / 2) * (v.b / 2) + v.h * v.h),
        areaWork: v => ["½ × " + v.b + " × " + v.h],
        perimWork: v => [
            v.b + " + 2 × √((" + v.b + " ÷ 2)² + " + v.h + "²)",
            v.b + " + 2 × " + n2(Math.sqrt((v.b / 2) * (v.b / 2) + v.h * v.h))
        ],
        box: v => [v.b, v.h, "polygon(50% 0, 100% 100%, 0 100%)"]
    },
    parallelogram: {
        areaText: "A = b × h", perimText: "P = 2(b + s)", perimLabel: "Perimeter",
        note: "s is the slanted side. It must be at least as long as h.",
        inputs: [["b", "Base (b)"], ["h", "Height (h)"], ["s", "Slanted side (s)"]],
        check: v => v.s < v.h ? "The slanted side must be at least as long as the height." : "",
        area: v => v.b * v.h,
        perimeter: v => 2 * (v.b + v.s),
        areaWork: v => [v.b + " × " + v.h],
        perimWork: v => ["2 × (" + v.b + " + " + v.s + ")"],
        box: v => {
            const lean = Math.sqrt(v.s * v.s - v.h * v.h);
            const w = v.b + lean;
            return [w, v.h, "polygon(" + (100 * lean / w) + "% 0, 100% 0, " + (100 * v.b / w) + "% 100%, 0 100%)"];
        }
    },
    trapezoid: {
        areaText: "A = ½(a + b) × h", perimText: "P = a + b + 2c", perimLabel: "Perimeter",
        note: "Isosceles trapezoid: a is the top, b the bottom, c = √(h² + ((b − a) ÷ 2)²).",
        inputs: [["a", "Top (a)"], ["b", "Bottom (b)"], ["h", "Height (h)"]],
        area: v => 0.5 * (v.a + v.b) * v.h,
        perimeter: v => v.a + v.b + 2 * Math.sqrt(v.h * v.h + ((v.b - v.a) / 2) * ((v.b - v.a) / 2)),
        areaWork: v => ["½ × (" + v.a + " + " + v.b + ") × " + v.h],
        perimWork: v => [
            v.a + " + " + v.b + " + 2 × √(" + v.h + "² + ((" + v.b + " − " + v.a + ") ÷ 2)²)",
            v.a + " + " + v.b + " + 2 × " + n2(Math.sqrt(v.h * v.h + ((v.b - v.a) / 2) * ((v.b - v.a) / 2)))
        ],
        box: v => {
            const w = Math.max(v.a, v.b);
            const topInset = 50 * (w - v.a) / w;
            const bottomInset = 50 * (w - v.b) / w;
            return [w, v.h, "polygon(" + topInset + "% 0, " + (100 - topInset) + "% 0, " +
                (100 - bottomInset) + "% 100%, " + bottomInset + "% 100%)"];
        }
    },
    pentagon: {
        areaText: "A = ¼√(5(5 + 2√5)) × s²", perimText: "P = 5s", perimLabel: "Perimeter",
        inputs: [["s", "Side (s)"]],
        area: v => 0.25 * Math.sqrt(5 * (5 + 2 * Math.sqrt(5))) * v.s * v.s,
        perimeter: v => 5 * v.s,
        areaWork: v => ["¼ × √(5 × (5 + 2√5)) × " + v.s + "²", "1.7205 × " + n2(v.s * v.s)],
        perimWork: v => ["5 × " + v.s],
        box: v => [1.618 * v.s, 1.539 * v.s, "polygon(50% 0, 100% 38%, 81% 100%, 19% 100%, 0 38%)"]
    },
    hexagon: {
        inputs: [["s", "Side (s)"]],
        area: v => (3 * Math.sqrt(3) / 2) * v.s * v.s,
        perimeter: v => 6 * v.s,
        areaWork: v => ["(3√3 ÷ 2) × " + v.s + "²", "2.5981 × " + n2(v.s * v.s)],
        perimWork: v => ["6 × " + v.s],
        box: v => [2 * v.s, Math.sqrt(3) * v.s, "polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%)"]
    }
};

// 78.5398 becomes 78.54, and 12.00 becomes 12
function n2(x) {
    return Number(x.toFixed(2));
}

// The category that uses this shape, or "" for the extra shapes
function categoryOfShape(shape) {
    for (let i = 0; i < categoryKeys.length; i++) {
        if (CATEGORIES[categoryKeys[i]].shape === shape) return categoryKeys[i];
    }
    return "";
}

// The colour class for a shape: its category colour, or its own colour (k-name)
function shapeColor(shape) {
    const key = categoryOfShape(shape);
    return key === "" ? "k-" + shape : "c-" + key;
}

// Formula text for a shape
function formulaOf(shape) {
    const key = categoryOfShape(shape);
    if (key !== "") {
        const c = CATEGORIES[key];
        return { area: c.area, perim: c.perimeter, label: c.perimeterLabel };
    }
    const m = SHAPE_MATH[shape];
    return { area: m.areaText, perim: m.perimText, label: m.perimLabel };
}

let calcShape = "circle";   // the shape chosen in the calculator
let calcValues = {};        // what is typed in the boxes, like { r: "5" }

const calcShapes = document.getElementById("calcShapes");
const calcInputs = document.getElementById("calcInputs");
const calcPreview = document.getElementById("calcPreview");
const calcSteps = document.getElementById("calcSteps");

// One button for each shape
function renderCalcShapes() {
    let html = "";
    for (let i = 0; i < SHAPE_ORDER.length; i++) {
        const shape = SHAPE_ORDER[i];
        let classes = "calc-shape " + shapeColor(shape);
        if (shape === calcShape) classes += " active";

        html += '<button type="button" class="' + classes + '" data-shape="' + shape + '">' +
            '<span class="shape sm ' + shape + '"></span>' + capitalize(shape) + "</button>";
    }
    calcShapes.innerHTML = html;
}

// One number box for each measurement the chosen shape needs
function renderCalcInputs() {
    const math = SHAPE_MATH[calcShape];
    let html = "";

    for (let i = 0; i < math.inputs.length; i++) {
        const id = math.inputs[i][0];
        if (calcValues[id] === undefined) calcValues[id] = "5";

        html += '<label>' + math.inputs[i][1] +
            '<input type="number" min="0" step="any" data-id="' + id + '" value="' + calcValues[id] + '"></label>';
    }
    calcInputs.innerHTML = html;
}

// Shows one calculation, line by line: formula, then each step of working, then the answer
function stepsHtml(title, formula, work, answer) {
    let html = '<div class="step-block"><b>' + title + "</b><code>" + escapeHtml(formula) + "</code>";
    for (let i = 0; i < work.length; i++) {
        html += "<code>= " + escapeHtml(work[i]) + "</code>";
    }
    return html + "<code><strong>= " + answer + "</strong></code></div>";
}

// Works out the answers, the steps, and redraws the preview shape
function updateCalc() {
    const math = SHAPE_MATH[calcShape];
    const text = formulaOf(calcShape);
    const values = {};
    let valid = true;

    for (let i = 0; i < math.inputs.length; i++) {
        const id = math.inputs[i][0];
        values[id] = parseFloat(calcValues[id]);
        if (isNaN(values[id]) || values[id] <= 0) valid = false;
    }

    // Some shapes cannot exist with certain numbers
    let problem = "";
    if (valid && math.check) problem = math.check(values);

    document.getElementById("calcPerimLabel").textContent = text.label + " (" + text.perim.charAt(0) + ")";
    document.getElementById("calcFormula").innerHTML =
        escapeHtml(text.area) + " &nbsp;|&nbsp; " + escapeHtml(text.perim) +
        (math.note ? "<br><small>" + escapeHtml(math.note) + "</small>" : "");

    if (!valid || problem !== "") {
        document.getElementById("calcArea").textContent = "-";
        document.getElementById("calcPerim").textContent = "-";
        calcPreview.innerHTML = "";
        calcSteps.innerHTML = '<p class="step-note">' + (problem !== "" ? problem : "Type a number bigger than 0 in every box.") + "</p>";
        return;
    }

    const area = math.area(values).toFixed(2) + " units²";
    const perimeter = math.perimeter(values).toFixed(2) + " units";
    document.getElementById("calcArea").textContent = area;
    document.getElementById("calcPerim").textContent = perimeter;

    calcSteps.innerHTML =
        stepsHtml("Area", text.area, math.areaWork(values), area) +
        stepsHtml(text.label, text.perim, math.perimWork(values), perimeter);

    // The preview is a sketch of the shape. It grows with the numbers (between 16 and 100 pixels).
    const box = math.box(values);
    const biggest = Math.max(box[0], box[1]);
    let scale = Math.min(10, 100 / biggest);
    if (biggest * scale < 16) scale = 16 / biggest;

    let style = "width:" + box[0] * scale + "px;height:" + box[1] * scale + "px;";
    if (box[2]) style += "clip-path:" + box[2] + ";";

    calcPreview.className = "calc-preview " + shapeColor(calcShape);
    calcPreview.innerHTML = '<span class="shape ' + calcShape + '" style="' + style + '"></span>';
}

calcShapes.addEventListener("click", function (event) {
    const button = event.target.closest("button");
    if (!button) return;

    calcShape = button.dataset.shape;
    calcValues = {};
    renderCalcShapes();
    renderCalcInputs();
    updateCalc();
});

calcInputs.addEventListener("input", function (event) {
    calcValues[event.target.dataset.id] = event.target.value;
    updateCalc();
});

// ===== A row of shapes above the footer =====
function renderShapeStrip() {
    let html = "";
    for (let i = 0; i < 40; i++) {
        const key = categoryKeys[i % categoryKeys.length];
        html += '<span class="shape ' + CATEGORIES[key].shape + " c-" + key + '"></span>';
    }
    document.getElementById("shapeStrip").innerHTML = html;
}

// ===== 13. Start =====
loadSettings();
applySettings();
updateBell();
renderSidebar();
renderCards();
renderShapeInfo();
renderHeroShapes();
renderShapePrompt();
renderCalcShapes();
renderCalcInputs();
updateCalc();
renderShapeStrip();
updateQuestionBadge();
renderRecovery();