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

// Keeps keyboard focus on the same button after a list is redrawn
function keepFocus(container, redraw) {
    const active = document.activeElement;
    let selector = "";
    if (active && container.contains(active) && active.dataset) {
        const idKey = active.dataset.id !== undefined ? "id" : (active.dataset.index !== undefined ? "index" : "");
        const own = Array.prototype.filter.call(active.classList, function (c) { return /-btn$/.test(c); })[0];
        if (idKey && own) selector = "." + own + '[data-' + idKey + '="' + active.dataset[idKey] + '"]';
    }
    redraw();
    if (selector) {
        const again = container.querySelector(selector);
        if (again) again.focus();
    }
}

// The first draw replaces the skeleton placeholders
let firstDraw = true;
function finishSkeletons() {
    if (!firstDraw) return;
    firstDraw = false;
    document.querySelectorAll("[data-sk]").forEach(function (node) { node.remove(); });
    document.getElementById("statsReal").hidden = false;
    ["statsSection", "chartPanel", "adminList"].forEach(function (id) {
        document.getElementById(id).setAttribute("aria-busy", "false");
    });
}

// ===== Shape chart: the AREA of each shape equals its number of announcements =====
const CHART_SHAPES = {
    circle: {
        size: a => { const r = Math.sqrt(a / Math.PI); return { w: 2 * r, h: 2 * r, value: r }; },
        rule: "r = √(A ÷ π)"
    },
    square: {
        size: a => { const s = Math.sqrt(a); return { w: s, h: s, value: s }; },
        rule: "s = √A"
    },
    triangle: {
        size: a => { const b = Math.sqrt(2 * a); return { w: b, h: b, value: b }; },
        rule: "b = h = √(2A)"
    },
    hexagon: {
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

    // One unit is 40 pixels, or smaller if the biggest shape would not fit (120 pixels)
    let pixels = 40;
    if (biggest * pixels > 120) pixels = 120 / biggest;

    let html = "";
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const cat = CATEGORIES[key];
        const chart = CHART_SHAPES[cat.shape];
        const count = countCategory(key);
        const size = sizes[key];

        let word = " announcements";
        if (count === 1) word = " announcement";

        let drawing = '<span class="chart-empty" aria-hidden="true"></span>';
        let rule = "Nothing posted yet";
        if (count > 0) {
            drawing = '<span class="shape chart-shape ' + cat.shape + '" aria-hidden="true" style="width:' + (size.w * pixels) +
                "px;height:" + (size.h * pixels) + 'px"></span>';
            rule = chart.rule + " = " + size.value.toFixed(2);
        }

        html += '<div class="chart-item c-' + key + '"><div class="chart-stage">' + drawing + "</div>" +
            "<strong>" + cat.name + "</strong>" +
            "<small>" + count + word + " · A = " + count + (count === 1 ? " unit²" : " units²") + "</small>" +
            "<em>" + rule + "</em></div>";
    }

    document.getElementById("shapeChart").innerHTML = html;
}

// ===== 3. Tabs (arrow keys, Home and End work) =====
const tabButtons = Array.prototype.slice.call(document.querySelectorAll(".tab-btn"));
const tabPanels = document.querySelectorAll(".tab-panel");

function selectTab(button, moveFocus) {
    for (let i = 0; i < tabButtons.length; i++) {
        const on = tabButtons[i] === button;
        tabButtons[i].setAttribute("aria-selected", String(on));
        tabButtons[i].tabIndex = on ? 0 : -1;
    }
    for (let i = 0; i < tabPanels.length; i++) {
        tabPanels[i].hidden = tabPanels[i].id !== button.dataset.tab;
    }
    if (moveFocus) button.focus();
}

tabButtons.forEach(function (button) {
    button.addEventListener("click", function () { selectTab(button, false); });
    button.addEventListener("keydown", function (event) {
        const index = tabButtons.indexOf(button);
        let next = -1;
        if (event.key === "ArrowRight") next = (index + 1) % tabButtons.length;
        else if (event.key === "ArrowLeft") next = (index - 1 + tabButtons.length) % tabButtons.length;
        else if (event.key === "Home") next = 0;
        else if (event.key === "End") next = tabButtons.length - 1;
        if (next < 0) return;
        event.preventDefault();
        selectTab(tabButtons[next], true);
    });
});

// ===== 4. Announcements tab =====
const adminList = document.getElementById("adminList");
const newBtn = document.getElementById("newBtn");

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
            ackHtml = '<div class="ack-meter"><strong>' + icon("shield") + confirmed + " of " + reach + " confirmed</strong>" +
                '<div class="meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + percent +
                '" aria-label="Confirmations for ' + escapeHtml(item.title) + '"><span style="width:' + percent + '%"></span></div></div>';
        }

        let tags = '<span class="tag c-' + key + '"><span class="shape ' + cat.shape + ' xs" aria-hidden="true"></span>' + cat.name + "</span>";
        if (item.pinned) tags += '<span class="tag">' + icon("pin") + "Pinned</span>";
        tags += '<span class="tag">' + audienceHtml(item) + "</span>";
        if (item.expires) {
            if (isExpired(item)) tags += '<span class="tag">' + icon("clock") + "Expired " + escapeHtml(item.expires) + "</span>";
            else tags += '<span class="tag tag--warning">' + icon("clock") + "Expires " + escapeHtml(item.expires) + "</span>";
        }

        html += '<article class="admin-item c-' + key + '">' +
            '<span class="shape-tile lg"><span class="shape ' + cat.shape + '" aria-hidden="true"></span></span>' +
            '<div class="admin-item__main"><div class="admin-tags">' + tags + "</div>" +
            "<h3>" + escapeHtml(item.title) + "</h3>" +
            '<p class="admin-date"><span>' + icon("calendar") + escapeHtml(item.date) + "</span>" +
            "<span>" + icon("users") + "Reaches " + reachText + "</span></p>" + ackHtml + "</div>" +
            '<div class="admin-actions">' +
            '<button type="button" class="btn btn--secondary btn--sm edit-btn" data-id="' + item.id + '" aria-label="Edit ' + escapeHtml(item.title) + '">' + icon("edit") + "Edit</button>" +
            '<button type="button" class="btn btn--danger btn--sm delete-btn" data-id="' + item.id + '" aria-label="Delete ' + escapeHtml(item.title) + '">' + icon("trash") + "Delete</button>" +
            "</div></article>";
    }

    keepFocus(adminList, function () { adminList.innerHTML = html; });
    document.getElementById("emptyMessage").hidden = announcements.length > 0;

    renderShapeChart();
    finishSkeletons();
}

// ===== 5. Students tab =====
const studentCourseFilter = document.getElementById("studentCourseFilter");
const studentSearch = document.getElementById("studentSearch");
const studentList = document.getElementById("studentList");
const pendingList = document.getElementById("pendingList");

for (let i = 0; i < COURSES.length; i++) {
    const course = COURSES[i];
    studentCourseFilter.add(new Option(course.code + " - " + course.name, course.code));
}

function formatDay(ms) {
    return new Date(ms).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function studentMeta(s, extra) {
    return '<p class="student-meta"><span>' + icon("idcard") + escapeHtml(s.id) + "</span>" +
        "<span>" + icon("cap") + escapeHtml(s.course) + " · " + escapeHtml(s.year) + "</span>" +
        "<span>" + icon("mail") + escapeHtml(s.email) + "</span>" +
        "<span>" + extra + "</span></p>";
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
        pendingHtml += '<article class="student-item"><div class="student-item__main">' +
            '<span class="tag tag--warning">' + icon("clock") + "Pending approval</span>" +
            "<h3>" + escapeHtml(p.name) + "</h3>" +
            studentMeta(p, "Requested " + formatDay(p.createdAt)) + "</div>" +
            '<div class="admin-actions">' +
            '<button type="button" class="btn btn--sm approve-btn" data-index="' + i + '" aria-label="Approve ' + escapeHtml(p.name) + '">' + icon("check") + "Approve</button>" +
            '<button type="button" class="btn btn--danger btn--sm reject-btn" data-index="' + i + '" aria-label="Reject ' + escapeHtml(p.name) + '">' + icon("close") + "Reject</button>" +
            "</div></article>";
    }
    keepFocus(pendingList, function () { pendingList.innerHTML = pendingHtml; });
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

        // The Remove button stores the position in the list, not the student ID
        html += '<article class="student-item"><div class="student-item__main">' +
            "<h3>" + escapeHtml(s.name) + "</h3>" +
            studentMeta(s, "Registered " + formatDay(s.createdAt)) + "</div>" +
            '<div class="admin-actions"><button type="button" class="btn btn--danger btn--sm delete-btn" data-index="' + i +
            '" aria-label="Remove ' + escapeHtml(s.name) + '">' + icon("trash") + "Remove</button></div></article>";
    }

    keepFocus(studentList, function () { studentList.innerHTML = html; });

    const noStudents = document.getElementById("noStudents");
    if (approvedTotal === 0) {
        noStudents.textContent = "No approved students yet.";
    } else {
        noStudents.textContent = "No students match your search.";
    }
    noStudents.hidden = shown > 0;
    document.getElementById("studentResultText").textContent =
        approvedTotal === 0 ? "" : "Showing " + shown + " of " + approvedTotal + (approvedTotal === 1 ? " student" : " students");
}

studentCourseFilter.addEventListener("change", renderStudents);
studentSearch.addEventListener("input", NeuUI.debounce(renderStudents, 120));

// Approve or reject an account that is waiting
pendingList.addEventListener("click", async function (event) {
    const button = event.target.closest("button");
    if (!button) return;
    const approve = button.classList.contains("approve-btn");
    const reject = button.classList.contains("reject-btn");
    if (!approve && !reject) return;

    const student = students[Number(button.dataset.index)];
    if (!student) return;

    if (approve) {
        approveStudent(student.id);
        students = loadStudents();
        NeuUI.toast(student.name + " approved", "success");
    } else {
        const yes = await NeuUI.confirm({
            title: "Reject this request?",
            message: "Reject " + student.name + "'s request? The account will be deleted and they can register again.",
            confirmText: "Reject request", danger: true
        });
        if (!yes) return;
        // The list may have changed while the question was open: find the person again
        const at = students.findIndex(function (s) { return s.id === student.id && !isApproved(s); });
        if (at < 0) return;
        students.splice(at, 1);
        saveStudents(students);
        NeuUI.toast("Request rejected", "success");
    }
    renderStudents();
    renderDashboard();
    if (!pendingList.contains(document.activeElement)) {
        (pendingList.querySelector("button") || studentSearch).focus();
    }
});

// Remove a student account
studentList.addEventListener("click", async function (event) {
    const button = event.target.closest(".delete-btn");
    if (!button) return;

    const student = students[Number(button.dataset.index)];
    if (!student) return;

    const yes = await NeuUI.confirm({
        title: "Remove this student?",
        message: "Remove " + student.name + "'s account? They will need to register again.",
        confirmText: "Remove student", danger: true
    });
    if (!yes) return;

    const at = students.findIndex(function (s) { return s.id === student.id; });
    if (at < 0) return;
    students.splice(at, 1);
    saveStudents(students);
    renderStudents();
    renderDashboard();
    NeuUI.toast("Student removed", "success");
    studentSearch.focus();
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
const formMessage = document.getElementById("formMessage");

// Urgent notices ask for a confirmation by default. The admin can still untick it.
categoryInput.addEventListener("change", function () {
    ackInput.checked = categoryInput.value === "urgent";
});

// Add each course to the "Send to" dropdown
for (let i = 0; i < COURSES.length; i++) {
    const code = COURSES[i].code;
    audienceInput.add(new Option(code + " students only", code));
}

// null = creating a new announcement, otherwise the id being edited
let editingId = null;

function openForm(item, trigger) {
    formMessage.hidden = true;
    NeuUI.clearErrors(announcementForm);

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

    NeuModal.open(formModal, { trigger: trigger || document.activeElement, initialFocus: "#titleInput" });
}

function closeFormPopup() {
    NeuModal.close(formModal);
}

newBtn.addEventListener("click", function () { openForm(null, newBtn); });
document.getElementById("newBtnEmpty").addEventListener("click", function (event) {
    openForm(null, event.currentTarget);
});

// ===== 7. Edit and delete announcements =====
adminList.addEventListener("click", async function (event) {
    const button = event.target.closest("button");
    if (!button) return;
    const id = Number(button.dataset.id);

    if (button.classList.contains("edit-btn")) {
        for (let i = 0; i < announcements.length; i++) {
            if (announcements[i].id === id) {
                openForm(announcements[i], button);
            }
        }
    }

    if (button.classList.contains("delete-btn")) {
        const target = announcements.filter(function (a) { return a.id === id; })[0];
        const yes = await NeuUI.confirm({
            title: "Delete this announcement?",
            message: target ? "“" + target.title + "” will be removed for every student. This cannot be undone." : "This cannot be undone.",
            confirmText: "Delete", danger: true
        });
        if (!yes) return;

        announcements = announcements.filter(function (a) { return a.id !== id; });
        saveAnnouncements(announcements);
        renderDashboard();
        NeuUI.toast("Announcement deleted", "success");
        (adminList.querySelector("button") || newBtn).focus();
    }
});

// ===== 8. Save (new or edited) =====
announcementForm.addEventListener("submit", function (event) {
    event.preventDefault();
    NeuUI.clearErrors(announcementForm);

    const title = titleInput.value.trim();
    const details = detailsInput.value.trim();

    if (title === "" || details === "") {
        formMessage.textContent = "Add a title and details before posting.";
        formMessage.hidden = false;
        if (title === "") NeuUI.fieldError(titleInput, "Please add a title.");
        if (details === "") NeuUI.fieldError(detailsInput, "Please add the details.");
        (title === "" ? titleInput : detailsInput).focus();
        return;
    }

    const wasEditing = editingId !== null;
    let savedId = editingId;

    if (wasEditing) {
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
        // Its id is the biggest existing id plus 1.
        let biggestId = 0;
        for (let i = 0; i < announcements.length; i++) {
            if (announcements[i].id > biggestId) {
                biggestId = announcements[i].id;
            }
        }
        savedId = biggestId + 1;

        const today = new Date().toLocaleDateString("en-US", {
            year: "numeric", month: "long", day: "numeric"
        });

        announcements.unshift({
            id: savedId,
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

    announcements = sortPinnedFirst(announcements);
    saveAnnouncements(announcements);
    renderDashboard();
    announcementForm.reset();
    closeFormPopup();
    NeuUI.toast(wasEditing ? "Changes saved" : "Announcement posted", "success");

    // The button that opened the pop-up was redrawn, so hand focus to the saved row (or the New button)
    const back = adminList.querySelector('.edit-btn[data-id="' + savedId + '"]') || newBtn;
    back.focus();
});

// ===== 9. Questions tab =====
const questionList = document.getElementById("questionList");
const questionFilter = document.getElementById("questionFilter");
let questions = loadQuestions();

function updateQuestionBadge() {
    let unanswered = 0;
    for (let i = 0; i < questions.length; i++) {
        if (questions[i].answer === "") unanswered++;
    }
    const badge = document.getElementById("questionBadge");
    badge.textContent = unanswered;
    badge.hidden = unanswered === 0;
}

function renderQuestions() {
    updateQuestionBadge();

    const filter = questionFilter.value;
    let html = "";
    let shown = 0;

    for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const answered = q.answer !== "";

        if (filter === "pending" && answered) continue;
        if (filter === "answered" && !answered) continue;

        shown++;

        let status = '<span class="tag tag--warning">' + icon("clock") + "Pending</span>";
        let buttonText = "Send reply";
        if (answered) {
            status = '<span class="tag tag--success">' + icon("checkcircle") + "Answered</span>";
            buttonText = "Update reply";
        }

        html += '<article class="question-item"><div class="q-top">' + status +
            '<span class="q-date">' + escapeHtml(q.date) + "</span></div>" +
            '<p class="q-from"><strong>' + escapeHtml(q.studentName) + "</strong> · " +
            escapeHtml(q.studentId) + " · " + escapeHtml(q.course) + "</p>";

        if (q.announcementTitle !== "") {
            html += '<p class="q-about">' + icon("megaphone") + "About: " + escapeHtml(q.announcementTitle) + "</p>";
        }

        html += '<p class="q-text">' + escapeHtml(q.text) + "</p>" +
            '<div class="field"><label class="sr-only" for="reply' + q.id + '">Your reply to ' + escapeHtml(q.studentName) + "</label>" +
            '<textarea class="input reply-box" id="reply' + q.id + '" rows="3" placeholder="Write your reply...">' +
            escapeHtml(q.answer) + "</textarea></div>" +
            '<div class="q-actions">' +
            '<button type="button" class="btn btn--sm reply-btn" data-id="' + q.id + '">' + buttonText + "</button>" +
            '<button type="button" class="btn btn--danger btn--sm delete-btn" data-id="' + q.id + '">' + icon("trash") + "Delete</button></div></article>";
    }

    keepFocus(questionList, function () { questionList.innerHTML = html; });

    const noQuestions = document.getElementById("noQuestions");
    if (questions.length === 0) {
        noQuestions.textContent = "No questions yet.";
    } else {
        noQuestions.textContent = "No questions match this filter.";
    }
    noQuestions.hidden = shown > 0;
    document.getElementById("questionResultText").textContent =
        questions.length === 0 ? "" : "Showing " + shown + " of " + questions.length + (questions.length === 1 ? " question" : " questions");
}

questionFilter.addEventListener("change", renderQuestions);

// Typing in a reply clears its error
questionList.addEventListener("input", function (event) {
    const field = event.target.closest(".field");
    if (field) {
        field.classList.remove("has-error");
        event.target.removeAttribute("aria-invalid");
    }
});

questionList.addEventListener("click", async function (event) {
    const button = event.target.closest("button");
    if (!button) return;
    const id = Number(button.dataset.id);

    if (button.classList.contains("reply-btn")) {
        const box = document.getElementById("reply" + id);
        const answer = box.value.trim();

        if (answer === "") {
            NeuUI.clearErrors(box.closest(".field"));
            NeuUI.fieldError(box, "Please write a reply first.");
            NeuUI.toast("Please write a reply first.", "error");
            box.focus();
            return;
        }

        answerQuestion(id, answer);
        questions = loadQuestions();
        renderQuestions();
        NeuUI.toast("Reply sent", "success");
    }

    if (button.classList.contains("delete-btn")) {
        const yes = await NeuUI.confirm({
            title: "Delete this question?",
            message: "The question and any reply will be removed for the student too.",
            confirmText: "Delete", danger: true
        });
        if (!yes) return;
        deleteQuestion(id);
        questions = loadQuestions();
        renderQuestions();
        NeuUI.toast("Question deleted", "success");
        questionFilter.focus();
    }
});

// ===== Sync: new data from another tab or device =====
// True while the admin is writing a reply that is not saved yet: redrawing would wipe it.
function replyInProgress() {
    const active = document.activeElement;
    if (active && active.tagName === "TEXTAREA" && questionList.contains(active)) return true;
    const boxes = questionList.querySelectorAll("textarea.reply-box");
    for (let i = 0; i < boxes.length; i++) {
        if (boxes[i].value !== boxes[i].defaultValue) return true;
    }
    return false;
}

function refreshFromStorage() {
    announcements = sortPinnedFirst(loadAnnouncements());
    students = loadStudents();
    questions = loadQuestions();
    renderDashboard();
    renderStudents();
    if (replyInProgress()) updateQuestionBadge();
    else renderQuestions();
}

window.addEventListener("storage", refreshFromStorage);
window.addEventListener("neucast:synced", refreshFromStorage);

// ===== 10. Start =====
renderDashboard();
renderStudents();
renderQuestions();

// The homepage sends the admin here with #questions in the address
if (window.location.hash === "#questions") {
    selectTab(document.getElementById("tab-questions"), false);
}
