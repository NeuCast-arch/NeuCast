// ===== Campus Calendar (homepage) =====
// Every day is a real button with a spoken label, like
// "October 1, 2026, 2 announcements: Urgent, Academic", so it works with a screen reader.

const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const today = new Date();
let shownYear = today.getFullYear();
let shownMonth = today.getMonth();

const calendarGrid = document.getElementById("calendarGrid");
const calendarTitle = document.getElementById("calendarTitle");
const calendarNote = document.getElementById("calendarNote");
const calClear = document.getElementById("calClear");

// Days that have announcements this viewer can see: { "2026-10-1": ["urgent", "academic"] }
function getBusyDays() {
    const busy = {};
    for (let i = 0; i < announcements.length; i++) {
        const item = announcements[i];
        if (!canSee(item)) continue;
        const key = dateKey(new Date(item.date));
        if (!busy[key]) busy[key] = [];
        if (!busy[key].includes(getKey(item))) busy[key].push(getKey(item));
    }
    return busy;
}

function renderCalendar() {
    calendarTitle.textContent = monthNames[shownMonth] + " " + shownYear;
    const busy = getBusyDays();

    const firstWeekday = new Date(shownYear, shownMonth, 1).getDay();
    const daysInMonth = new Date(shownYear, shownMonth + 1, 0).getDate();

    let html = "";
    for (let i = 0; i < firstWeekday; i++) html += "<span></span>";

    // Count announcements per day for the spoken label
    const perDay = {};
    for (let i = 0; i < announcements.length; i++) {
        if (!canSee(announcements[i])) continue;
        const k = dateKey(new Date(announcements[i].date));
        perDay[k] = (perDay[k] || 0) + 1;
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const key = shownYear + "-" + (shownMonth + 1) + "-" + day;
        const isToday = key === dateKey(today);
        const selected = key === activeDate;

        let classes = "cal-day";
        if (isToday) classes += " today";
        if (busy[key]) classes += " has-news";
        if (selected) classes += " selected";

        let label = monthNames[shownMonth] + " " + day + ", " + shownYear;
        let shapes = "";
        if (busy[key]) {
            const names = busy[key].map(function (k) { return CATEGORIES[k].name; });
            label += ", " + plural(perDay[key], "announcement", "announcements") + ": " + names.join(", ");
            shapes = '<span class="cal-shapes" aria-hidden="true">';
            for (let i = 0; i < busy[key].length && i < 3; i++) {
                const cat = CATEGORIES[busy[key][i]];
                shapes += '<i class="shape xs ' + cat.shape + " c-" + busy[key][i] + '"></i>';
            }
            shapes += "</span>";
        } else {
            label += ", no announcements";
        }
        if (isToday) label += ", today";

        html += '<button type="button" class="' + classes + '" data-key="' + key + '" aria-label="' + label + '" aria-pressed="' + selected + '"' +
            (isToday ? ' aria-current="date"' : "") + ">" + day + shapes + "</button>";
    }

    calendarGrid.innerHTML = html;
    calendarGrid.setAttribute("aria-busy", "false");

    if (activeDate === "") {
        calendarNote.textContent = "Shapes under a day show which categories were posted. Pick a day to see them.";
        calClear.hidden = true;
    } else {
        calendarNote.textContent = "Showing announcements from the selected day only.";
        calClear.hidden = false;
    }
}

// Pick a day: show only that day's announcements. Pick it again to show everything.
calendarGrid.addEventListener("click", function (event) {
    const day = event.target.closest(".cal-day");
    if (!day) return;
    const key = day.dataset.key;

    activeDate = activeDate === key ? "" : key;
    renderCalendar();
    renderCards();

    const again = calendarGrid.querySelector('[data-key="' + key + '"]');
    if (again) again.focus();
    if (activeDate !== "") scrollToList();
});

document.getElementById("calPrev").addEventListener("click", function () {
    shownMonth -= 1;
    if (shownMonth < 0) { shownMonth = 11; shownYear -= 1; }
    renderCalendar();
});

document.getElementById("calNext").addEventListener("click", function () {
    shownMonth += 1;
    if (shownMonth > 11) { shownMonth = 0; shownYear += 1; }
    renderCalendar();
});

document.getElementById("calToday").addEventListener("click", function () {
    shownYear = today.getFullYear();
    shownMonth = today.getMonth();
    renderCalendar();
});

calClear.addEventListener("click", function () {
    activeDate = "";
    renderCalendar();
    renderCards();
});

renderCalendar();
