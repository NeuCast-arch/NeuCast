// =====================================================
//  Health & Safety page (safety.html) — Parallelogram: Health & Campus Safety Protocol
//  Load order (see boot.js tag): icons, ui, cloud-config, cloud, data, feature-nav, safety
// =====================================================

let announcements = sortPinnedFirst(loadAnnouncements());

const list = document.getElementById("safetyList");
const emptyBox = document.getElementById("safetyEmpty");
const countEl = document.getElementById("safetyCount");
const toolsRow = document.getElementById("safetyTools");

const SAFETY_FILTERS = [
    { name: "all", label: "All bulletins" },
    { name: "active", label: "Active now" },
    { name: "urgent", label: "Urgent" },
    { name: "safety", label: "Health & Safety" }
];
let activeFilter = "all";

function plural(count, one, many) {
    return count + " " + (count === 1 ? one : many);
}

function canSee(item) {
    if (adminView) return true;
    if (!student) return false;
    const audience = audienceOf(item);
    return audience === "all" || audience === student.course;
}

function safetyItems() {
    return announcements.filter(function (a) {
        const key = getKey(a);
        return (key === "safety" || key === "urgent") && canSee(a);
    });
}

function isPriority(item) {
    return !isExpired(item) && (getKey(item) === "urgent" || item.pinned === true);
}

function matchesFilter(item) {
    if (activeFilter === "active") return !isExpired(item);
    if (activeFilter === "urgent") return getKey(item) === "urgent";
    if (activeFilter === "safety") return getKey(item) === "safety";
    return true;
}

function renderTools() {
    let html = "";
    for (let i = 0; i < SAFETY_FILTERS.length; i++) {
        const f = SAFETY_FILTERS[i];
        html += '<button type="button" class="chip" data-filter="' + f.name + '" aria-pressed="' + (activeFilter === f.name) + '">' + f.label + "</button>";
    }
    toolsRow.innerHTML = html;
}

function render() {
    const items = safetyItems().filter(matchesFilter);

    // Priority (active, urgent or pinned) bulletins float to the top
    items.sort(function (a, b) { return (isPriority(b) ? 1 : 0) - (isPriority(a) ? 1 : 0); });

    countEl.textContent = items.length === 0 ? "" : "Showing " + plural(items.length, "bulletin", "bulletins");

    let html = "";
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const key = getKey(item);
        const cat = CATEGORIES[key];
        const priority = isPriority(item);

        let tags = '<span class="tag c-' + key + '"><span class="shape xs ' + cat.shape + '" aria-hidden="true"></span>' + cat.name + "</span>";
        if (priority) tags += '<span class="tag tag--danger">' + icon("alert") + "Immediate attention</span>";
        if (isExpired(item)) tags += '<span class="chrono-badge">' + icon("clock") + "Resolved / expired " + escapeHtml(item.expires) + "</span>";

        html += '<article class="notice safety-card c-' + key + (priority ? " is-priority" : "") + '">' +
            '<span class="shape-tile lg"><span class="shape parallelogram" aria-hidden="true"></span></span>' +
            '<div class="notice__main">' +
            '<div class="notice__tags">' + tags + "</div>" +
            "<h3>" + escapeHtml(item.title) + "</h3>" +
            "<p>" + escapeHtml(item.details) + "</p>" +
            '<div class="notice__meta"><span>' + icon("calendar") + escapeHtml(item.date) + "</span><span>" + audienceHtml(item) + "</span></div>" +
            "</div></article>";
    }

    list.setAttribute("aria-busy", "false");
    list.innerHTML = html;
    emptyBox.hidden = items.length > 0;
}

toolsRow.addEventListener("click", function (event) {
    const button = event.target.closest("[data-filter]");
    if (!button) return;
    activeFilter = button.dataset.filter;
    renderTools();
    render();
});

function refreshFromStorage() {
    announcements = sortPinnedFirst(loadAnnouncements());
    render();
}
window.addEventListener("storage", refreshFromStorage);
window.addEventListener("neucast:synced", refreshFromStorage);

renderTools();
render();
