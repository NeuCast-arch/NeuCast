// =====================================================
//  SITE SETTINGS - edit this block to make the site yours
// =====================================================
const SITE = {
    appName: "NeuCast",
    universityName: "New Era University",
    tagline: "Godliness is the foundation of knowledge.",
    logoImage: "",
    heroImage: ""
};


// Content of the About pop-up. Replace the placeholders with your own details.
const ABOUT = {
    intro: "NeuCast is the centralized notification system of " + SITE.universityName +
        ". It brings university-wide and course-specific announcements into one place, so nothing gets lost in group chats or bulletin boards.",

    steps: [
        ["Create your account", "Register with your student ID, email, course, and year level."],
        ["Get your announcements", "You automatically see university-wide announcements plus the ones for your own course."],
        ["Stay on top of them", "New announcements are tagged NEW. Open one to mark it as read; the bell counts unread urgent notices."]
    ],

    faq: [
        ["Why can't I see an announcement my friend sees?", "Some announcements are sent to one course only. Check that the course in your profile is correct."],
        ["Who posts the announcements?", "University administrators, through the admin dashboard."],
        ["I moved up a year or changed courses. What now?", "Click your name at the top right to open your profile, then update your course and year level."],
        ["What does the Pinned tag mean?", "Pinned announcements are important ones kept at the top of the list."]
    ],

    // [office, email, hours]
    contacts: [
        ["Registrar", "registrar@youruniversity.edu", "Mon-Fri, 8:00 AM - 5:00 PM"],
        ["IT Help Desk", "itsupport@youruniversity.edu", "Mon-Fri, 8:00 AM - 5:00 PM"],
        ["Student Affairs", "studentaffairs@youruniversity.edu", "Mon-Fri, 8:00 AM - 5:00 PM"]
    ],

    project: {
        team: "Fantactic 4",
        course: "BSIT",
        adviser: "Adviser's name",
        year: "SY 2026-2027",
        version: "1.0"
    }
};

// Courses students can pick from. Replace with your university's courses.
const COURSES = [
    { code: "BSIT", name: "BS Information Technology" },
    { code: "BSCS", name: "BS Computer Science" },
    { code: "BSIS", name: "BS Information Systems" },
    { code: "BSBA", name: "BS Business Administration" },
    { code: "BSED", name: "BS Education" },
    { code: "BSN", name: "BS Nursing" },
    { code: "BSPsyc", name: "BS Psychology"},
    { code: "BSIS", name: "BS information System"},
];

const YEAR_LEVELS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

// =====================================================
//  Everything below works without changes
// =====================================================
const STORAGE_KEY = "neucast_announcements";
const LOGIN_KEY = "neucast_admin_logged_in";
const STUDENTS_KEY = "neucast_students";
const STUDENT_SESSION_KEY = "neucast_student_id";
const READ_KEY_PREFIX = "neucast_read_";

// Data saved under the old project name is moved to the new NeuCast keys the first time
// any page loads, so your test accounts, announcements, and questions are not lost.
// After you have opened the site once, you may delete this whole block.
function moveOldData() {
    try {
        const oldPrefix = "campusconnect_";
        const newPrefix = "neucast_";
        const oldKeys = [];

        // Collect the names first, because items are removed while we loop
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith(oldPrefix)) {
                oldKeys.push(key);
            }
        }

        for (let i = 0; i < oldKeys.length; i++) {
            const newKey = newPrefix + oldKeys[i].slice(oldPrefix.length);

            // Copy only if the new name is still empty
            if (localStorage.getItem(newKey) === null) {
                localStorage.setItem(newKey, localStorage.getItem(oldKeys[i]));
            }
            localStorage.removeItem(oldKeys[i]);
        }

        // The admin login is kept in sessionStorage
        const oldLogin = sessionStorage.getItem(oldPrefix + "admin_logged_in");
        if (oldLogin !== null) {
            sessionStorage.setItem(newPrefix + "admin_logged_in", oldLogin);
            sessionStorage.removeItem(oldPrefix + "admin_logged_in");
        }
    } catch (error) {
        // Storage is not available: nothing to move
    }
}

moveOldData();

// Test admin account (for local testing only)
const DEMO_EMAIL = "admin@neucast.test";
const DEMO_PASSWORD = "admin123";

// Dropdown choices as [value, text] pairs
const COURSE_OPTIONS = COURSES.map(c => [c.code, c.code + " - " + c.name]);
const YEAR_OPTIONS = YEAR_LEVELS.map(y => [y, y]);

// The announcement categories (used by the homepage and the admin page)
const CATEGORIES = {
    academic: {
        name: "Academic", shape: "circle", desc: "Exams, Enrollment, Classes",
        area: "A = πr²", perimeterLabel: "Circumference", perimeter: "C = 2πr",
        use: "Used for academic notices: exams, enrollment, and classes."
    },
    events: {
        name: "Events", shape: "square", desc: "Activities, Seminars, Programs",
        area: "A = s²", perimeterLabel: "Perimeter", perimeter: "P = 4s",
        use: "Used for events: activities, seminars, and programs."
    },
    urgent: {
        name: "Urgent", shape: "triangle", desc: "Emergency, Suspension, Alerts",
        area: "A = ½ × b × h", perimeterLabel: "Perimeter", perimeter: "P = a + b + c",
        use: "Used for urgent alerts and warnings."
    },
    general: {
        name: "General", shape: "hexagon", desc: "Notices, Updates, Other",
        area: "A = (3√3 / 2) × s²", perimeterLabel: "Perimeter", perimeter: "P = 6s",
        use: "Used for general notices and updates."
    }
};

// Text shown above the shape cards in the About pop-up
const GEOMETRY_INTRO = "We use geometric shapes not just for design, but for structure, organization, and function. Here are the shapes we use and their formulas.";

// Starter announcements, used the first time the site loads
const defaultAnnouncements = [
    {
        id: 1,
        title: "Classes Suspended Tomorrow",
        category: "urgent",
        audience: "all",
        date: "October 1, 2026",
        details: "Due to severe weather, all classes at all levels are suspended for tomorrow, October 2. Online activities are also cancelled. Please stay safe and watch this page for updates on when classes will resume."
    },
    {
        id: 2,
        title: "Midterm Exam Schedule Released",
        category: "academic",
        audience: COURSES[0].code,
        date: "September 28, 2026",
        details: "The " + COURSES[0].code + " midterm exam schedule is now available at the department office and on the student portal. Check your section's exam date, time, and room. Bring your school ID on exam day."
    },
    {
        id: 3,
        title: "Enrollment for Next Semester Opens Monday",
        category: "academic",
        audience: "all",
        date: "September 27, 2026",
        details: "Enrollment for next semester opens this coming Monday. Please settle any pending balances and clear your requirements before enrolling. Students with unsettled accounts will not be able to enroll."
    },
    {
        id: 4,
        title: "Campus Wi-Fi Maintenance Tonight",
        category: "urgent",
        audience: "all",
        date: "September 30, 2026",
        details: "The campus network will be offline from 10 PM to 2 AM tonight for scheduled maintenance. Please save your work and log out of online systems before 10 PM."
    }
];

// ----- Small helpers shared by every page -----
const $ = id => document.getElementById(id);

// Reads JSON from localStorage; returns the fallback if it is missing or damaged
function readJSON(key, fallback) {
    try {
        return JSON.parse(localStorage.getItem(key)) || fallback;
    } catch (error) {
        return fallback;
    }
}

// Unknown categories are treated as General
const getKey = item => CATEGORIES[item.category] ? item.category : "general";

// Old announcements without an audience go to everyone
const audienceOf = item => item.audience || "all";

// Plain text version, such as "All Students" or "BSIT"
function audienceLabel(item) {
    if (audienceOf(item) === "all") {
        return "All Students";
    }
    return audienceOf(item);
}

// Same thing with a small icon in front (used on cards and lists)
function audienceHtml(item) {
    if (audienceOf(item) === "all") {
        return icon("globe") + " All Students";
    }
    return icon("cap") + " " + escapeHtml(audienceOf(item));
}

// Adds [value, text] options to a dropdown
function fillSelect(select, items) {
    items.forEach(([value, text]) => select.add(new Option(text, value)));
}

// Shows a success or error message in a .login-message paragraph
function showMessage(element, text, type) {
    element.textContent = text;
    element.className = "login-message " + type;
    element.hidden = false;
}

// Stops anything an admin types from being treated as code
function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

// ----- Announcements -----
function loadAnnouncements() {
    const saved = readJSON(STORAGE_KEY, null);
    if (saved) return saved;

    saveAnnouncements(defaultAnnouncements); // first visit, or damaged data
    return defaultAnnouncements.slice();
}

const saveAnnouncements = list => localStorage.setItem(STORAGE_KEY, JSON.stringify(list));

// Pinned announcements first; everything else keeps its order
const sortPinnedFirst = list => list.slice().sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

// ----- Admin test login -----
const checkLogin = (email, password) => email === DEMO_EMAIL && password === DEMO_PASSWORD;
// Logging in as admin also ends any student session left on this browser (and the other way round)
function logIn() {
    localStorage.removeItem(STUDENT_SESSION_KEY);
    sessionStorage.setItem(LOGIN_KEY, "yes");
}
const logOut = () => sessionStorage.removeItem(LOGIN_KEY);
const isLoggedIn = () => sessionStorage.getItem(LOGIN_KEY) === "yes";

// ----- Student accounts -----
const loadStudents = () => readJSON(STUDENTS_KEY, []);
const saveStudents = list => localStorage.setItem(STUDENTS_KEY, JSON.stringify(list));

// Returns { ok: true, student } or { ok: false, error }
function registerStudent(info) {
    const students = loadStudents();
    const email = info.email.toLowerCase();

    if (email === DEMO_EMAIL) {
        return { ok: false, error: "That email can't be used." };
    }
    if (students.some(s => s.email === email)) {
        return { ok: false, error: "An account with this email already exists." };
    }
    if (students.some(s => s.id.toLowerCase() === info.id.toLowerCase())) {
        return { ok: false, error: "That student ID is already registered." };
    }

    // New accounts wait for an admin to approve them before they can log in
    const student = {
        id: info.id,
        name: info.name,
        email: email,
        course: info.course,
        year: info.year,
        password: info.password,
        status: "pending",
        createdAt: Date.now()
    };

    students.push(student);
    saveStudents(students);
    return { ok: true, student: student };
}

// Accounts made before approval existed have no status, so they count as approved
const isApproved = student => student.status !== "pending";
const pendingStudents = () => loadStudents().filter(s => !isApproved(s));

// Admin approves a waiting account
function approveStudent(id) {
    const students = loadStudents();
    const student = students.find(s => s.id === id);
    if (!student) return false;
    student.status = "approved";
    student.approvedAt = Date.now();
    saveStudents(students);
    return true;
}

// Returns { ok: true, student }, { ok: false, pending: true } or { ok: false }
function loginStudent(email, password) {
    const match = loadStudents().find(s => s.email === email.toLowerCase() && s.password === password);
    if (!match) return { ok: false };
    if (!isApproved(match)) return { ok: false, pending: true };
    return { ok: true, student: match };
}

function studentLogIn(id) {
    sessionStorage.removeItem(LOGIN_KEY);
    localStorage.setItem(STUDENT_SESSION_KEY, id);
}
const studentLogOut = () => localStorage.removeItem(STUDENT_SESSION_KEY);

// Returns the logged-in student, or null
function getCurrentStudent() {
    const id = localStorage.getItem(STUDENT_SESSION_KEY);
    return (id && loadStudents().find(s => s.id === id && isApproved(s))) || null;
}

// ----- Student profile -----
function updateStudentProfile(id, changes) {
    const students = loadStudents();
    const student = students.find(s => s.id === id);
    if (!student) return false;

    student.name = changes.name;
    student.course = changes.course;
    student.year = changes.year;
    saveStudents(students);
    return true;
}

// Returns { ok: true } or { ok: false, error }
function changeStudentPassword(id, currentPassword, newPassword) {
    const students = loadStudents();
    const student = students.find(s => s.id === id);

    if (!student) return { ok: false, error: "Account not found." };
    if (student.password !== currentPassword) {
        return { ok: false, error: "Your current password is incorrect." };
    }

    student.password = newPassword;
    saveStudents(students);
    return { ok: true };
}

// ----- Read / unread tracking (one list per student) -----
const loadReadIds = studentId => readJSON(READ_KEY_PREFIX + studentId, []);
const saveReadIds = (studentId, ids) => localStorage.setItem(READ_KEY_PREFIX + studentId, JSON.stringify(ids));

// ----- Apply the site settings to whichever page is open -----
function applySiteSettings() {
    const each = (selector, fn) => document.querySelectorAll(selector).forEach(fn);

    // University name under the logo, and the footer
    each(".brand-sub", el => (el.textContent = SITE.universityName));
    each(".footer strong", el => (el.textContent = SITE.appName.toUpperCase() + " · " + SITE.universityName));
    each(".footer em", el => (el.textContent = "\u201C" + SITE.tagline + "\u201D"));

    // Logo in the top bar
    each(".brand-mark", el => {
        if (SITE.logoImage) {
            el.classList.add("has-logo");
            el.style.backgroundImage = 'url("' + SITE.logoImage + '")';
            el.textContent = "";
        } else {
            el.innerHTML = icon("neucast");
        }
    });

    // Hero photo
    const hero = document.querySelector(".hero");
    if (hero && SITE.heroImage) {
        hero.classList.add("has-photo");
        hero.style.backgroundImage = 'url("' + SITE.heroImage + '")';
    }

}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applySiteSettings);
} else {
    applySiteSettings();
}

// ----- Questions from students -----
const QUESTIONS_KEY = "neucast_questions";

// Today's date as text, like "October 4, 2026"
function todayText() {
    return new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function loadQuestions() {
    const saved = localStorage.getItem(QUESTIONS_KEY);
    if (!saved) return [];

    try {
        return JSON.parse(saved);
    } catch (error) {
        return [];
    }
}

function saveQuestions(list) {
    localStorage.setItem(QUESTIONS_KEY, JSON.stringify(list));
}

// Saves a new question. "announcement" can be null for a general question.
function addQuestion(student, text, announcement) {
    const questions = loadQuestions();

    // The new id is the biggest existing id plus 1
    let biggestId = 0;
    for (let i = 0; i < questions.length; i++) {
        if (questions[i].id > biggestId) {
            biggestId = questions[i].id;
        }
    }

    const question = {
        id: biggestId + 1,
        studentId: student.id,
        studentName: student.name,
        course: student.course,
        announcementId: 0,
        announcementTitle: "",
        text: text,
        date: todayText(),
        answer: "",
        answerDate: "",
        seen: true      // "seen" means the student has seen the admin's reply
    };

    if (announcement) {
        question.announcementId = announcement.id;
        question.announcementTitle = announcement.title;
    }

    questions.unshift(question);   // newest first
    saveQuestions(questions);
    return question;
}

// The admin writes (or changes) a reply
function answerQuestion(id, answer) {
    const questions = loadQuestions();

    for (let i = 0; i < questions.length; i++) {
        if (questions[i].id === id) {
            questions[i].answer = answer;
            questions[i].answerDate = todayText();
            questions[i].seen = false;     // the student has not seen this reply yet
        }
    }

    saveQuestions(questions);
}

function deleteQuestion(id) {
    const questions = loadQuestions();
    const kept = [];

    for (let i = 0; i < questions.length; i++) {
        if (questions[i].id !== id) {
            kept.push(questions[i]);
        }
    }

    saveQuestions(kept);
}

// Only the questions asked by one student
function getStudentQuestions(studentId) {
    const questions = loadQuestions();
    const mine = [];

    for (let i = 0; i < questions.length; i++) {
        if (questions[i].studentId === studentId) {
            mine.push(questions[i]);
        }
    }

    return mine;
}

// How many replies has this student not seen yet?
function countNewReplies(studentId) {
    const mine = getStudentQuestions(studentId);
    let count = 0;

    for (let i = 0; i < mine.length; i++) {
        if (mine[i].answer !== "" && !mine[i].seen) {
            count++;
        }
    }

    return count;
}

// Marks all of a student's replies as seen
function markRepliesSeen(studentId) {
    const questions = loadQuestions();

    for (let i = 0; i < questions.length; i++) {
        if (questions[i].studentId === studentId) {
            questions[i].seen = true;
        }
    }

    saveQuestions(questions);
}

// ----- Acknowledgments: "I have read this" confirmations for critical notices -----
// One map for everyone, like { "1": ["2026-00123", "2026-00456"] }, so the admin can count them.
const ACKS_KEY = "neucast_acks";
const loadAcks = () => readJSON(ACKS_KEY, {});

// Urgent announcements need a confirmation unless the admin turned it off.
// Any other category needs one only when the admin turned it on.
function needsAck(item) {
    if (item.requireAck === true) return true;
    if (item.requireAck === false) return false;
    return getKey(item) === "urgent";
}

const hasAcked = (item, studentId) => (loadAcks()[item.id] || []).includes(studentId);
const countAcks = item => (loadAcks()[item.id] || []).length;

function acknowledge(item, studentId) {
    const acks = loadAcks();
    const list = acks[item.id] || [];
    if (!list.includes(studentId)) list.push(studentId);
    acks[item.id] = list;
    localStorage.setItem(ACKS_KEY, JSON.stringify(acks));
}

// ----- Versions: lets us tell a student "this was edited after you read it" -----
// Saved per student as { "1": 1767225600000 } = the announcement's updatedAt when they read it.
const READVER_KEY_PREFIX = "neucast_readver_";
const loadReadVersions = studentId => readJSON(READVER_KEY_PREFIX + studentId, {});
function saveReadVersion(studentId, item) {
    const versions = loadReadVersions(studentId);
    versions[item.id] = item.updatedAt || 0;
    localStorage.setItem(READVER_KEY_PREFIX + studentId, JSON.stringify(versions));
}

// Expiry: the admin can set a last day. "2026-10-20" is read as the end of that day.
function isExpired(item) {
    if (!item.expires) return false;
    const end = new Date(item.expires + "T23:59:59");
    return !isNaN(end) && end < new Date();
}
