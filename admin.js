// ===== 1. Login check =====
const dashboard = document.getElementById("dashboard");

if (isLoggedIn()) {
    dashboard.hidden = false;
} else {
    window.location.href = "login.html";
}

document.getElementById("logoutBtn").addEventListener("click", function () {
    logOut();
    window.location.href = "login.html";
});

// Use the dark mode chosen on the homepage
try {
    if (JSON.parse(localStorage.getItem("neucast_settings")).dark === true) document.body.classList.add("dark");
} catch (error) {
    // No saved settings: stay light
}

// ===== 2. Data =====
let announcements = sortPinnedFirst(loadAnnouncements());
let students = loadStudents();

// How many announcements are in a category
function countCategory(key) {
    let count = 0;
    for (let i = 0; i < announcements.length; i++) {
        if (getKey(announcements[i]) === key) {
            count++;
        }
    }
    return count;
}

// How many registered students will receive an announcement
function countRecipients(item) {
    const audience = audienceOf(item);

    if (audience === "all") {
        return students.filter(isApproved).length;
    }

    let count = 0;
    for (let i = 0; i < students.length; i++) {
        if (isApproved(students[i]) && students[i].course === audience) {
            count++;
        }
    }
    return count;
}

// ===== Shape chart: the AREA of each shape equals its number of announcements =====
// For each shape, "size" turns an area A into the shape's measurements (in units),
// and "rule" is the same formula written out, so the chart shows its own maths.
const CHART_SHAPES = {
    circle: {
        // A = πr²  so  r = √(A ÷ π)
        size: a => { const r = Math.sqrt(a / Math.PI); return { w: 2 * r, h: 2 * r, value: r }; },
        rule: "r = √(A ÷ π)"
    },
    square: {
        // A = s²  so  s = √A
        size: a => { const s = Math.sqrt(a); return { w: s, h: s, value: s }; },
        rule: "s = √A"
    },
    triangle: {
        // A = ½ × b × h with b = h  so  b = √(2A)
        size: a => { const b = Math.sqrt(2 * a); return { w: b, h: b, value: b }; },
        rule: "b = h = √(2A)"
    },
    hexagon: {
        // A = (3√3 ÷ 2) × s²  so  s = √(2A ÷ 3√3). It is 2s wide and √3 × s tall.
        size: a => { const s = Math.sqrt(2 * a / (3 * Math.sqrt(3))); return { w: 2 * s, h: Math.sqrt(3) * s, value: s }; },
        rule: "s = √(2A ÷ 3√3)"
    }
};

function renderShapeChart() {
    const keys = Object.keys(CATEGORIES);
    const sizes = {};
    let biggest = 0;

    // Measure every shape first, so they can all share one scale
    for (let i = 0; i < keys.length; i++) {
        const count = countCategory(keys[i]);
        sizes[keys[i]] = CHART_SHAPES[CATEGORIES[keys[i]].shape].size(count);
        biggest = Math.max(biggest, sizes[keys[i]].w, sizes[keys[i]].h);
    }

    // One unit is 40 pixels, or smaller if the biggest shape would not fit (130 pixels)
    let pixels = 40;
    if (biggest * pixels > 130) pixels = 130 / biggest;

    let html = "";
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const cat = CATEGORIES[key];
        const chart = CHART_SHAPES[cat.shape];
        const count = countCategory(key);
        const size = sizes[key];

        let word = " announcements";
        if (count === 1) word = " announcement";

        let drawing = '<span class="chart-empty"></span>';
        let rule = "Nothing posted yet";
        if (count > 0) {
            drawing = '<span class="shape chart-shape ' + cat.shape + '" style="width:' + (size.w * pixels) +
                "px;height:" + (size.h * pixels) + 'px"></span>';
            rule = chart.rule + " = " + size.value.toFixed(2);
        }

        html += '<div class="chart-item c-' + key + '"><div class="chart-stage">' + drawing + "</div>" +
            "<strong>" + cat.name + "</strong>" +
            "<small>" + count + word + " · A = " + count + " units²</small>" +
            "<em>" + rule + "</em></div>";
    }

    document.getElementById("shapeChart").innerHTML = html;
}

// ===== 3. Tabs =====
const tabButtons = document.querySelectorAll(".tab-btn");
const tabPanels = document.querySelectorAll(".tab-panel");

tabButtons.forEach(function (button) {
    button.addEventListener("click", function () {
        for (let i = 0; i < tabButtons.length; i++) {
            tabButtons[i].classList.toggle("active", tabButtons[i] === button);
            tabButtons[i].setAttribute("aria-selected", String(tabButtons[i] === button));
        }
        for (let i = 0; i < tabPanels.length; i++) {
            tabPanels[i].hidden = tabPanels[i].id !== button.dataset.tab;
        }
    });
});

// ===== 4. Announcements tab =====
const adminList = document.getElementById("adminList");

function renderDashboard() {
    document.getElementById("totalCount").textContent = announcements.length;
    document.getElementById("urgentCount").textContent = countCategory("urgent");
    document.getElementById("academicCount").textContent = countCategory("academic");
    document.getElementById("studentCount").textContent = students.filter(isApproved).length;

    let html = "";

    for (let i = 0; i < announcements.length; i++) {
        const item = announcements[i];
        const key = getKey(item);
        const cat = CATEGORIES[key];
        const reach = countRecipients(item);

        let reachText = reach + " students";
        if (reach === 1) reachText = "1 student";

        let ackHtml = "";
        if (needsAck(item)) {
            const confirmed = countAcks(item);
            const percent = reach === 0 ? 0 : Math.min(100, Math.round((confirmed / reach) * 100));
            ackHtml = '<div class="ack-meter"><span class="shape hexagon sm" aria-hidden="true"></span>' +
                '<div><strong>' + confirmed + " of " + reach + " confirmed</strong>" +
                '<div class="ack-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + percent +
                '" aria-label="Confirmations"><span style="width:' + percent + '%"></span></div></div></div>';
        }

        html += '<article class="admin-item c-' + key + '"><div class="admin-item__main">' +
            '<span class="badge"><span class="shape xs ' + cat.shape + '"></span>' + cat.name + "</span>";
        if (item.pinned) html += '<span class="pin-tag">' + icon("pin") + " Pinned</span>";
        html += '<span class="audience-tag">' + audienceHtml(item) + "</span>" +
            "<h3>" + escapeHtml(item.title) + "</h3>" +
            '<p class="admin-date">' + icon("calendar") + " " + escapeHtml(item.date) +
            " · " + icon("users") + " Reaches " + reachText +
            (item.expires ? " · Expires " + escapeHtml(item.expires) : "") + "</p>" + ackHtml + "</div>" +
            '<div class="admin-actions">' +
            '<button class="nb-btn nb-btn--sm edit-btn" data-id="' + item.id + '">Edit</button>' +
            '<button class="nb-btn nb-btn--sm nb-btn--danger delete-btn" data-id="' + item.id + '">Delete</button>' +
            "</div></article>";
    }

    adminList.innerHTML = html;
    document.getElementById("emptyMessage").hidden = announcements.length > 0;

    renderShapeChart();
}

// ===== 5. Students tab =====
const studentCourseFilter = document.getElementById("studentCourseFilter");
const studentSearch = document.getElementById("studentSearch");
const studentList = document.getElementById("studentList");

for (let i = 0; i < COURSES.length; i++) {
    const course = COURSES[i];
    studentCourseFilter.add(new Option(course.code + " - " + course.name, course.code));
}

function renderStudents() {
    // Number of students in each course
    let chips = "";
    for (let i = 0; i < COURSES.length; i++) {
        let count = 0;
        for (let j = 0; j < students.length; j++) {
            if (isApproved(students[j]) && students[j].course === COURSES[i].code) count++;
        }
        chips += '<span class="course-chip">' + escapeHtml(COURSES[i].code) + ": <strong>" + count + "</strong></span>";
    }
    document.getElementById("courseCounts").innerHTML = chips;

    // The list, narrowed by the course filter and the search box
    const course = studentCourseFilter.value;
    const text = studentSearch.value.toLowerCase().trim();
    let shown = 0;
    let html = "";

    // Accounts waiting for approval get their own list at the top
    let pendingHtml = "";
    let pendingTotal = 0;
    for (let i = 0; i < students.length; i++) {
        const p = students[i];
        if (isApproved(p)) continue;
        pendingTotal++;
        pendingHtml += '<article class="student-item"><div>' +
            "<h3>" + escapeHtml(p.name) + "</h3>" +
            '<p class="student-meta">' +
            icon("idcard") + " " + escapeHtml(p.id) + " · " +
            icon("cap") + " " + escapeHtml(p.course) + " · " + escapeHtml(p.year) + "<br>" +
            icon("mail") + " " + escapeHtml(p.email) + " · Requested " +
            new Date(p.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) + "</p></div>" +
            '<div><button class="nb-btn nb-btn--sm approve-btn" data-index="' + i + '">Approve</button> ' +
            '<button class="nb-btn nb-btn--sm nb-btn--danger reject-btn" data-index="' + i + '">Reject</button></div></article>';
    }
    document.getElementById("pendingList").innerHTML = pendingHtml;
    document.getElementById("pendingSection").hidden = pendingTotal === 0;
    const pendingBadge = document.getElementById("pendingBadge");
    pendingBadge.textContent = pendingTotal;
    pendingBadge.hidden = pendingTotal === 0;

    let approvedTotal = 0;
    for (let i = 0; i < students.length; i++) {
        const s = students[i];

        if (!isApproved(s)) continue;
        approvedTotal++;

        if (course !== "" && s.course !== course) continue;

        const inName = s.name.toLowerCase().includes(text);
        const inId = s.id.toLowerCase().includes(text);
        const inEmail = s.email.toLowerCase().includes(text);
        if (!inName && !inId && !inEmail) continue;

        shown++;

        const registered = new Date(s.createdAt).toLocaleDateString("en-US", {
            year: "numeric", month: "short", day: "numeric"
        });

        // The Remove button stores the position in the list, not the student ID
        html += '<article class="student-item"><div>' +
            "<h3>" + escapeHtml(s.name) + "</h3>" +
            '<p class="student-meta">' +
            icon("idcard") + " " + escapeHtml(s.id) + " · " +
            icon("cap") + " " + escapeHtml(s.course) + " · " + escapeHtml(s.year) + "<br>" +
            icon("mail") + " " + escapeHtml(s.email) + " · Registered " + registered + "</p></div>" +
            '<button class="nb-btn nb-btn--sm nb-btn--danger delete-btn" data-index="' + i + '">Remove</button></article>';
    }

    studentList.innerHTML = html;

    const noStudents = document.getElementById("noStudents");
    if (approvedTotal === 0) {
        noStudents.textContent = "No approved students yet.";
    } else {
        noStudents.textContent = "No students match your search.";
    }
    noStudents.hidden = shown > 0;
}

studentCourseFilter.addEventListener("change", renderStudents);
studentSearch.addEventListener("input", renderStudents);

// Approve or reject an account that is waiting
document.getElementById("pendingList").addEventListener("click", function (event) {
    const approve = event.target.classList.contains("approve-btn");
    const reject = event.target.classList.contains("reject-btn");
    if (!approve && !reject) return;

    const student = students[Number(event.target.dataset.index)];
    if (!student) return;

    if (approve) {
        approveStudent(student.id);
        students = loadStudents();
    } else if (confirm("Reject " + student.name + "'s request? The account will be deleted and they can register again.")) {
        students.splice(Number(event.target.dataset.index), 1);
        saveStudents(students);
    } else {
        return;
    }
    renderStudents();
    renderDashboard();
});

// Remove a student account
studentList.addEventListener("click", function (event) {
    if (!event.target.classList.contains("delete-btn")) return;

    const index = Number(event.target.dataset.index);
    const student = students[index];
    if (!student) return;

    if (confirm("Remove " + student.name + "'s account? They will need to register again.")) {
        students.splice(index, 1);
        saveStudents(students);
        renderStudents();
        renderDashboard();
    }
});

// ===== 6. Announcement form pop-up (used for both new and edit) =====
const formModal = document.getElementById("formModal");
const formTitle = document.getElementById("formTitle");
const submitBtn = document.getElementById("submitBtn");
const announcementForm = document.getElementById("announcementForm");
const titleInput = document.getElementById("titleInput");
const categoryInput = document.getElementById("categoryInput");
const audienceInput = document.getElementById("audienceInput");
const detailsInput = document.getElementById("detailsInput");
const pinInput = document.getElementById("pinInput");
const ackInput = document.getElementById("ackInput");
const expiresInput = document.getElementById("expiresInput");

// Urgent notices ask for a confirmation by default. The admin can still untick it.
categoryInput.addEventListener("change", function () {
    ackInput.checked = categoryInput.value === "urgent";
});
const formMessage = document.getElementById("formMessage");

// Add each course to the "Send to" dropdown
for (let i = 0; i < COURSES.length; i++) {
    const code = COURSES[i].code;
    audienceInput.add(new Option(code + " students only", code));
}

// null = creating a new announcement, otherwise the id being edited
let editingId = null;

function openForm(item) {
    formMessage.hidden = true;

    if (item) {
        editingId = item.id;
        formTitle.textContent = "Edit announcement";
        submitBtn.textContent = "Save changes";
        titleInput.value = item.title;
        categoryInput.value = getKey(item);
        audienceInput.value = audienceOf(item);
        if (audienceInput.value === "") {
            audienceInput.value = "all"; // that course no longer exists
        }
        detailsInput.value = item.details;
        pinInput.checked = item.pinned === true;
        ackInput.checked = needsAck(item);
        expiresInput.value = item.expires || "";
    } else {
        editingId = null;
        formTitle.textContent = "New announcement";
        submitBtn.textContent = "Post announcement";
        announcementForm.reset();
        ackInput.checked = categoryInput.value === "urgent";
    }

    formModal.hidden = false;
    titleInput.focus();
}

function closeFormPopup() {
    formModal.hidden = true;
}

document.getElementById("newBtn").addEventListener("click", function () {
    openForm(null);
});

document.getElementById("closeForm").addEventListener("click", closeFormPopup);

formModal.addEventListener("click", function (event) {
    if (event.target === formModal) closeFormPopup();
});

document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeFormPopup();
});

// ===== 7. Edit and delete announcements =====
adminList.addEventListener("click", function (event) {
    const id = Number(event.target.dataset.id);

    if (event.target.classList.contains("edit-btn")) {
        for (let i = 0; i < announcements.length; i++) {
            if (announcements[i].id === id) {
                openForm(announcements[i]);
            }
        }
    }

    if (event.target.classList.contains("delete-btn")) {
        if (confirm("Delete this announcement?")) {
            const kept = [];
            for (let i = 0; i < announcements.length; i++) {
                if (announcements[i].id !== id) {
                    kept.push(announcements[i]);
                }
            }
            announcements = kept;
            saveAnnouncements(announcements);
            renderDashboard();
        }
    }
});

// ===== 8. Save (new or edited) =====
announcementForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const title = titleInput.value.trim();
    const details = detailsInput.value.trim();

    if (title === "" || details === "") {
        formMessage.textContent = "Add a title and details before posting.";
        formMessage.hidden = false;
        return;
    }

    if (editingId !== null) {
        // Change the existing announcement
        for (let i = 0; i < announcements.length; i++) {
            if (announcements[i].id === editingId) {
                announcements[i].title = title;
                announcements[i].category = categoryInput.value;
                announcements[i].audience = audienceInput.value;
                announcements[i].details = details;
                announcements[i].pinned = pinInput.checked;
                announcements[i].requireAck = ackInput.checked;
                announcements[i].expires = expiresInput.value;
                announcements[i].updatedAt = Date.now();   // students see "edited since you read it"
            }
        }
    } else {
        // Make a new announcement. Its id is the biggest existing id plus 1.
        let biggestId = 0;
        for (let i = 0; i < announcements.length; i++) {
            if (announcements[i].id > biggestId) {
                biggestId = announcements[i].id;
            }
        }

        const today = new Date().toLocaleDateString("en-US", {
            year: "numeric", month: "long", day: "numeric"
        });

        announcements.unshift({
            id: biggestId + 1,
            title: title,
            category: categoryInput.value,
            audience: audienceInput.value,
            details: details,
            pinned: pinInput.checked,
            requireAck: ackInput.checked,
            expires: expiresInput.value,
            date: today
        });
    }

    // Pinned announcements move to the top
    announcements = sortPinnedFirst(announcements);
    saveAnnouncements(announcements);
    renderDashboard();
    announcementForm.reset();
    closeFormPopup();
});

// ===== 9. Questions tab =====
const questionList = document.getElementById("questionList");
const questionFilter = document.getElementById("questionFilter");
let questions = loadQuestions();

function renderQuestions() {
    // Count the questions that have no reply yet (shown as a red number on the tab)
    let unanswered = 0;
    for (let i = 0; i < questions.length; i++) {
        if (questions[i].answer === "") {
            unanswered++;
        }
    }

    const badge = document.getElementById("questionBadge");
    badge.textContent = unanswered;
    badge.hidden = unanswered === 0;

    const filter = questionFilter.value;
    let html = "";
    let shown = 0;

    for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const answered = q.answer !== "";

        // Apply the filter dropdown
        if (filter === "pending" && answered) continue;
        if (filter === "answered" && !answered) continue;

        shown++;

        let status = '<span class="q-status pending">Pending</span>';
        let buttonText = "Send reply";
        if (answered) {
            status = '<span class="q-status answered">Answered</span>';
            buttonText = "Update reply";
        }

        html += '<article class="question-item"><div class="q-top">' + status +
            '<span class="q-date">' + escapeHtml(q.date) + "</span></div>" +
            '<p class="q-from"><strong>' + escapeHtml(q.studentName) + "</strong> · " +
            escapeHtml(q.studentId) + " · " + escapeHtml(q.course) + "</p>";

        if (q.announcementTitle !== "") {
            html += '<p class="q-about">' + icon("megaphone") + " About: " + escapeHtml(q.announcementTitle) + "</p>";
        }

        html += '<p class="q-text">' + escapeHtml(q.text) + "</p>" +
            '<textarea class="nb-input reply-box" id="reply' + q.id + '" rows="3" placeholder="Write your reply...">' +
            escapeHtml(q.answer) + "</textarea>" +
            '<div class="q-actions">' +
            '<button class="nb-btn nb-btn--sm nb-btn--accent reply-btn" data-id="' + q.id + '">' + buttonText + "</button>" +
            '<button class="nb-btn nb-btn--sm nb-btn--danger delete-btn" data-id="' + q.id + '">Delete</button></div></article>';
    }

    questionList.innerHTML = html;

    const noQuestions = document.getElementById("noQuestions");
    if (questions.length === 0) {
        noQuestions.textContent = "No questions yet.";
    } else {
        noQuestions.textContent = "No questions match this filter.";
    }
    noQuestions.hidden = shown > 0;
}

questionFilter.addEventListener("change", renderQuestions);

// Reply and Delete buttons (one listener handles every question)
questionList.addEventListener("click", function (event) {
    const id = Number(event.target.dataset.id);

    if (event.target.classList.contains("reply-btn")) {
        const box = document.getElementById("reply" + id);
        const answer = box.value.trim();

        if (answer === "") {
            alert("Please write a reply first.");
            return;
        }

        answerQuestion(id, answer);
        questions = loadQuestions();
        renderQuestions();
    }

    if (event.target.classList.contains("delete-btn")) {
        if (confirm("Delete this question?")) {
            deleteQuestion(id);
            questions = loadQuestions();
            renderQuestions();
        }
    }
});

window.addEventListener("storage", function () { students = loadStudents(); renderDashboard(); renderStudents(); });

// ===== 10. Start =====
renderDashboard();
renderStudents();
renderQuestions();

// The homepage sends the admin here with #questions in the address
if (window.location.hash === "#questions") {
    document.querySelector('[data-tab="questionsTab"]').click();
}

// Cloud sync: when new data arrives from another device (a student registering, a question), redraw the lists
window.addEventListener("neucast:synced", function () {
    announcements = sortPinnedFirst(loadAnnouncements());
    students = loadStudents();
    questions = loadQuestions();
    renderDashboard();
    renderStudents();
    renderQuestions();
});
