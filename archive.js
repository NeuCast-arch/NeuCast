// =====================================================
//  Archive page (archive.html) — Rectangle: Announcement History & Archive Engine
//  Load order (see boot.js tag): icons, ui, cloud-config, cloud, data, feature-nav, archive
// =====================================================

let announcements = sortPinnedFirst(loadAnnouncements());
let readIds = student ? loadReadIds(student.id) : [];

const list = document.getElementById("archiveList");
const emptyBox = document.getElementById("archiveEmpty");
const countEl = document.getElementById("archiveCount");
const searchInput = document.getElementById("archiveSearch");
const scopeSelect = document.getElementById("archiveScope");
const rangeSelect = document.getElementById("archiveRange");
const categorySelect = document.getElementById("archiveCategory");
const toolsRow = document.getElementById("archiveTools");

// Category dropdown, built from the same CATEGORIES used everywhere else
Object.keys(CATEGORIES).forEach(function (key) {
    categorySelect.add(new Option(CATEGORIES[key].name, key));
});

const STATUS_FILTERS = [
    { name: "all", label: "All" },
    { name: "expired", label: "Expired" },
    { name: "read", label: "Read", studentOnly: true },
    { name: "unread", label: "Unread", studentOnly: true }
];
let activeStatus = "all";

function plural(count, one, many) {
    return count + " " + (count === 1 ? one : many);
}

function canSee(item) {
    if (adminView) return true;
    if (!student) return false;
    const audience = audienceOf(item);
    return audience === "all" || audience === student.course;
}

function parseItemDate(text) {
    const d = new Date(text);
    return isNaN(d) ? null : d;
}

function withinRange(item) {
    const days = rangeSelect.value;
    if (days === "all") return true;
    const d = parseItemDate(item.date);
    if (!d) return true;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - Number(days));
    return d >= cutoff;
}

function matchesScope(item) {
    const scope = scopeSelect.value;
    if (scope === "all-students") return audienceOf(item) === "all";
    if (scope === "mine") return !!student && audienceOf(item) === student.course;
    return true;
}

function matchesStatus(item) {
    if (activeStatus === "expired") return isExpired(item);
    if (activeStatus === "read") return !!student && readIds.indexOf(item.id) >= 0;
    if (activeStatus === "unread") return !!student && readIds.indexOf(item.id) < 0;
    return true;
}

function matchesSearch(item) {
    const q = searchInput.value.trim().toLowerCase();
    if (q === "") return true;
    return item.title.toLowerCase().indexOf(q) >= 0 || item.details.toLowerCase().indexOf(q) >= 0;
}

function renderTools() {
    let html = "";
    for (let i = 0; i < STATUS_FILTERS.length; i++) {
        const f = STATUS_FILTERS[i];
        if (f.studentOnly && !student) continue;
        html += '<button type="button" class="chip" data-status="' + f.name + '" aria-pressed="' + (activeStatus === f.name) + '">' + f.label + "</button>";
    }
    toolsRow.innerHTML = html;
}

function render() {
    const category = categorySelect.value;
    const filtered = announcements.filter(function (item) {
        return canSee(item) && matchesScope(item) && withinRange(item) && matchesStatus(item) && matchesSearch(item) &&
            (category === "all" || getKey(item) === category);
    });

    countEl.textContent = filtered.length === 0 ? "" : "Showing " + plural(filtered.length, "announcement", "announcements");

    let html = "";
    for (let i = 0; i < filtered.length; i++) {
        const item = filtered[i];
        const key = getKey(item);
        const cat = CATEGORIES[key];
        const unread = !!student && readIds.indexOf(item.id) < 0;

        let tags = '<span class="tag c-' + key + '"><span class="shape xs ' + cat.shape + '" aria-hidden="true"></span>' + cat.name + "</span>";
        if (item.pinned) tags += '<span class="tag">' + icon("pin") + "Pinned</span>";
        if (isExpired(item)) {
            tags += '<span class="chrono-badge">' + icon("clock") + "Expired " + escapeHtml(item.expires) + "</span>";
        } else if (student && !unread) {
            tags += '<span class="tag tag--success">' + icon("check") + "Read</span>";
        }

        html += '<article class="notice' + (unread ? " unread" : "") + " c-" + key + '">' +
            '<span class="shape-tile lg"><span class="shape rectangle" aria-hidden="true"></span></span>' +
            '<div class="notice__main">' +
            '<div class="notice__tags">' + tags + "</div>" +
            "<h3>" + escapeHtml(item.title) + "</h3>" +
            '<div class="notice__meta"><span>' + icon("calendar") + "Posted " + escapeHtml(item.date) + "</span><span>" + audienceHtml(item) + "</span></div>" +
            '<details class="archive-card__details"><summary>' + icon("chevrondown") + " View full details</summary>" +
            '<div class="archive-card__body"><p>' + escapeHtml(item.details) + "</p></div></details>" +
            "</div></article>";
    }

    list.setAttribute("aria-busy", "false");
    list.innerHTML = html;
    emptyBox.hidden = filtered.length > 0;
}

toolsRow.addEventListener("click", function (event) {
    const button = event.target.closest("[data-status]");
    if (!button) return;
    activeStatus = button.dataset.status;
    renderTools();
    render();
});

searchInput.addEventListener("input", NeuUI.debounce(render, 120));
[scopeSelect, rangeSelect, categorySelect].forEach(function (el) { el.addEventListener("change", render); });

function refreshFromStorage() {
    announcements = sortPinnedFirst(loadAnnouncements());
    readIds = student ? loadReadIds(student.id) : [];
    render();
}
window.addEventListener("storage", refreshFromStorage);
window.addEventListener("neucast:synced", refreshFromStorage);

renderTools();
render();
