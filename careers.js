// =====================================================
//  Careers & OJT page (careers.html) — Trapezoid: Student Orgs, Careers & OJT Hub
//  Load order (see boot.js tag): icons, ui, cloud-config, cloud, data, feature-nav, careers
// =====================================================

let announcements = sortPinnedFirst(loadAnnouncements());
let savedIds = student ? loadSavedIds(student.id) : [];
let appliedIds = student ? loadAppliedIds(student.id) : [];

const list = document.getElementById("careersList");
const emptyBox = document.getElementById("careersEmpty");
const countEl = document.getElementById("careersCount");
const searchInput = document.getElementById("careersSearch");
const programSelect = document.getElementById("careersProgram");
const toolsRow = document.getElementById("careersTools");

COURSES.forEach(function (c) { programSelect.add(new Option(c.code + " - " + c.name, c.code)); });

const SHOW_FILTERS = [
    { name: "all", label: "All listings" },
    { name: "open", label: "Not yet expired" },
    { name: "saved", label: "Saved", studentOnly: true },
    { name: "applied", label: "Applied", studentOnly: true }
];
let activeShow = "all";

function plural(count, one, many) {
    return count + " " + (count === 1 ? one : many);
}

function careerItems() {
    return announcements.filter(function (a) { return getKey(a) === "careers"; });
}

function trackLabel(item) {
    // The admin's audience choice doubles as the career "track" shown on the ribbon
    return audienceOf(item) === "all" ? "Open to all students" : audienceOf(item) + " track";
}

function matchesProgram(item) {
    const program = programSelect.value;
    if (program === "all") return true;
    if (program === "all-students") return audienceOf(item) === "all";
    return audienceOf(item) === program;
}

function matchesSearch(item) {
    const q = searchInput.value.trim().toLowerCase();
    if (q === "") return true;
    return item.title.toLowerCase().indexOf(q) >= 0 || item.details.toLowerCase().indexOf(q) >= 0;
}

function matchesShow(item) {
    if (activeShow === "open") return !isExpired(item);
    if (activeShow === "saved") return !!student && savedIds.indexOf(item.id) >= 0;
    if (activeShow === "applied") return !!student && appliedIds.indexOf(item.id) >= 0;
    return true;
}

function renderTools() {
    let html = "";
    for (let i = 0; i < SHOW_FILTERS.length; i++) {
        const f = SHOW_FILTERS[i];
        if (f.studentOnly && !student) continue;
        html += '<button type="button" class="chip" data-show="' + f.name + '" aria-pressed="' + (activeShow === f.name) + '">' + f.label + "</button>";
    }
    toolsRow.innerHTML = html;
}

function render() {
    const filtered = careerItems().filter(function (item) {
        return matchesProgram(item) && matchesSearch(item) && matchesShow(item);
    });

    countEl.textContent = filtered.length === 0 ? "" : "Showing " + plural(filtered.length, "listing", "listings");

    let html = "";
    for (let i = 0; i < filtered.length; i++) {
        const item = filtered[i];
        const saved = !!student && savedIds.indexOf(item.id) >= 0;
        const applied = !!student && appliedIds.indexOf(item.id) >= 0;

        let meta = '<span>' + icon("calendar") + "Posted " + escapeHtml(item.date) + "</span>";
        if (item.expires) {
            meta += isExpired(item)
                ? '<span>' + icon("clock") + "Closed " + escapeHtml(item.expires) + "</span>"
                : '<span>' + icon("clock") + "Apply by " + escapeHtml(item.expires) + "</span>";
        }

        let actions = "";
        if (student) {
            actions = '<div class="careers-card__actions">';
            if (item.applyUrl) {
                actions += '<a class="btn btn--sm" href="' + escapeHtml(item.applyUrl) + '" target="_blank" rel="noopener" data-id="' + item.id + '" data-apply-link>' +
                    icon("send") + "Apply now</a>";
            } else {
                actions += '<button type="button" class="btn btn--sm" data-id="' + item.id + '" data-apply>' + icon("send") + "Apply now</button>";
            }
            actions += '<button type="button" class="btn btn--secondary btn--sm" data-id="' + item.id + '" data-save aria-pressed="' + saved + '">' +
                icon(saved ? "checkcircle" : "plus") + (saved ? "Saved" : "Save opportunity") + "</button>";
            if (applied) actions += '<span class="tag tag--success">' + icon("check") + "Applied</span>";
            actions += "</div>";
        }

        html += '<article class="notice c-careers">' +
            '<span class="shape-tile lg"><span class="shape trapezoid" aria-hidden="true"></span></span>' +
            '<div class="notice__main">' +
            '<span class="track-ribbon">' + escapeHtml(trackLabel(item)) + "</span>" +
            "<h3>" + escapeHtml(item.title) + "</h3>" +
            "<p>" + escapeHtml(item.details) + "</p>" +
            '<div class="notice__meta">' + meta + "</div>" +
            actions +
            "</div></article>";
    }

    list.setAttribute("aria-busy", "false");
    list.innerHTML = html;
    emptyBox.hidden = filtered.length > 0;
}

toolsRow.addEventListener("click", function (event) {
    const button = event.target.closest("[data-show]");
    if (!button) return;
    activeShow = button.dataset.show;
    renderTools();
    render();
});

list.addEventListener("click", function (event) {
    if (!student) return;

    const saveBtn = event.target.closest("[data-save]");
    if (saveBtn) {
        const nowSaved = toggleSaved(student.id, Number(saveBtn.dataset.id));
        savedIds = loadSavedIds(student.id);
        NeuUI.toast(nowSaved ? "Opportunity saved" : "Removed from saved", "success");
        render();
        return;
    }

    const applyLink = event.target.closest("[data-apply-link]");
    if (applyLink) {
        markApplied(student.id, Number(applyLink.dataset.id));
        appliedIds = loadAppliedIds(student.id);
        return; // the link itself opens the apply page
    }

    const applyBtn = event.target.closest("[data-apply]");
    if (applyBtn) {
        markApplied(student.id, Number(applyBtn.dataset.id));
        appliedIds = loadAppliedIds(student.id);
        NeuUI.toast("Marked as applied. Follow the listing's instructions to finish applying.", "success");
        render();
    }
});

searchInput.addEventListener("input", NeuUI.debounce(render, 120));
programSelect.addEventListener("change", render);

function refreshFromStorage() {
    announcements = sortPinnedFirst(loadAnnouncements());
    savedIds = student ? loadSavedIds(student.id) : [];
    appliedIds = student ? loadAppliedIds(student.id) : [];
    render();
}
window.addEventListener("storage", refreshFromStorage);
window.addEventListener("neucast:synced", refreshFromStorage);

renderTools();
render();
