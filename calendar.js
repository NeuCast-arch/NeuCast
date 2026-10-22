// ===== Campus Calendar =====

const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const today = new Date();

// The month being shown (month 0 = January, 11 = December)
let shownYear = today.getFullYear();
let shownMonth = today.getMonth();

const calendarGrid = document.getElementById("calendarGrid");
const calendarTitle = document.getElementById("calendarTitle");
const calendarNote = document.getElementById("calendarNote");
const calClear = document.getElementById("calClear");

// Makes a list of the days that have announcements this viewer can see.
// Each day holds the categories posted that day, like { "2026-10-1": ["urgent", "academic"] }
function getBusyDays() {
    const busy = {};

    for (let i = 0; i < announcements.length; i++) {
        const item = announcements[i];

        if (canSee(item)) {
            const key = dateKey(new Date(item.date));
            if (!busy[key]) busy[key] = [];
            if (!busy[key].includes(getKey(item))) busy[key].push(getKey(item));
        }
    }

    return busy;
}

// Draws the calendar for the month being shown
function renderCalendar() {
    calendarTitle.textContent = monthNames[shownMonth] + " " + shownYear;

    const busy = getBusyDays();

    // What weekday is the 1st? (0 = Sunday ... 6 = Saturday)
    const firstWeekday = new Date(shownYear, shownMonth, 1).getDay();

    // How many days are in this month? (day 0 of next month = last day of this month)
    const daysInMonth = new Date(shownYear, shownMonth + 1, 0).getDate();

    let html = "";

    // Empty boxes before the 1st
    for (let i = 0; i < firstWeekday; i++) {
        html += "<span></span>";
    }

    // One button for each day
    for (let day = 1; day <= daysInMonth; day++) {
        const key = shownYear + "-" + (shownMonth + 1) + "-" + day;

        let classes = "cal-day";
        if (key === dateKey(today)) classes += " today";
        if (busy[key]) classes += " has-news";
        if (key === activeDate) classes += " selected";

        // Up to three small shapes under the number: one for each category posted that day
        let shapes = "";
        let names = "";
        if (busy[key]) {
            shapes = '<span class="cal-shapes">';
            for (let i = 0; i < busy[key].length && i < 3; i++) {
                const cat = CATEGORIES[busy[key][i]];
                shapes += '<i class="cal-shape ' + cat.shape + " c-" + busy[key][i] + '"></i>';
            }
            shapes += "</span>";

            names = ' title="' + busy[key].map(function (k) { return CATEGORIES[k].name; }).join(", ") + '"';
        }

        html += '<button class="' + classes + '" data-key="' + key + '"' + names + ">" + day + shapes + "</button>";
    }

    calendarGrid.innerHTML = html;

    // The note under the calendar
    if (activeDate === "") {
        calendarNote.textContent = "Shapes under a day show which categories were posted. Click a day to see them.";
        calClear.hidden = true;
    } else {
        calendarNote.textContent = "Showing announcements from the selected day only.";
        calClear.hidden = false;
    }
}

// Click a day: show only that day's announcements. Click it again to show everything.
calendarGrid.addEventListener("click", function (event) {
    const day = event.target.closest(".cal-day");
    if (!day) return; // the click was not on a day button
    const key = day.dataset.key;

    if (activeDate === key) {
        activeDate = "";
    } else {
        activeDate = key;
    }

    renderCalendar();
    renderCards();

    if (activeDate !== "") {
        scrollToList();
    }
});

// Previous month
document.getElementById("calPrev").addEventListener("click", function () {
    shownMonth = shownMonth - 1;
    if (shownMonth < 0) {
        shownMonth = 11;
        shownYear = shownYear - 1;
    }
    renderCalendar();
});

// Next month
document.getElementById("calNext").addEventListener("click", function () {
    shownMonth = shownMonth + 1;
    if (shownMonth > 11) {
        shownMonth = 0;
        shownYear = shownYear + 1;
    }
    renderCalendar();
});

// Jump back to this month
document.getElementById("calToday").addEventListener("click", function () {
    shownYear = today.getFullYear();
    shownMonth = today.getMonth();
    renderCalendar();
});

// Show all dates again
calClear.addEventListener("click", function () {
    activeDate = "";
    renderCalendar();
    renderCards();
});

// Start
renderCalendar();