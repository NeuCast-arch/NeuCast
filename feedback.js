// =====================================================
//  Feedback page (feedback.html) — Pentagon: Student Feedback & Incident Reports
//  Load order (see boot.js tag): icons, ui, cloud-config, cloud, data, feature-nav, feedback
// =====================================================

let feedback = loadFeedback();

const ratingRow = document.getElementById("pentagonRating");
const ratingAverage = document.getElementById("ratingAverage");
const ratingMessage = document.getElementById("ratingMessage");
const form = document.getElementById("feedbackForm");
const textInput = document.getElementById("feedbackText");
const formMessage = document.getElementById("feedbackMessage");
const myList = document.getElementById("myFeedback");
const noFeedback = document.getElementById("noFeedback");

function myRating() {
    if (!student) return 0;
    const mine = feedback.filter(function (f) { return f.studentId === student.id && f.kind === "rating"; });
    return mine.length ? mine[0].rating : 0;
}

function renderAverage() {
    const avg = averageRating();
    const count = feedback.filter(function (f) { return f.kind === "rating"; }).length;
    ratingAverage.innerHTML = avg === null
        ? "No ratings yet &mdash; be the first."
        : "<strong>" + avg.toFixed(1) + " / 5</strong> average, from " + count + (count === 1 ? " rating" : " ratings") + ".";
}

function renderRatingRow() {
    const current = myRating();
    let html = "";
    for (let i = 1; i <= 5; i++) {
        const lit = i <= current;
        html += '<button type="button" class="' + (lit ? "is-lit" : "") + '" data-value="' + i +
            '" role="radio" aria-checked="' + (i === current) + '" aria-label="' + i + (i === 1 ? " point" : " points") + '"' +
            (adminView ? " disabled" : "") + '><span class="shape pentagon" aria-hidden="true"></span></button>';
    }
    ratingRow.innerHTML = html;
    renderAverage();
}

ratingRow.addEventListener("click", function (event) {
    const button = event.target.closest("button[data-value]");
    if (!button || !student) return;

    const value = Number(button.dataset.value);
    addFeedback(student, "rating", "", value);
    feedback = loadFeedback();
    renderRatingRow();

    ratingMessage.textContent = "Thanks! Your rating was saved.";
    ratingMessage.hidden = false;
    NeuUI.toast("Rating saved", "success");
    window.setTimeout(function () { ratingMessage.hidden = true; }, 4000);
});

function kindLabel(kind) {
    if (kind === "bug") return "Bug report";
    if (kind === "rating") return "Rating";
    return "Suggestion";
}

function renderMine() {
    if (!student) {
        myList.innerHTML = "";
        noFeedback.hidden = false;
        noFeedback.textContent = "Sign in as a student to send feedback or see your submissions.";
        return;
    }

    const mine = feedback.filter(function (f) { return f.studentId === student.id && f.kind !== "rating"; });
    let html = "";

    for (let i = 0; i < mine.length; i++) {
        const f = mine[i];
        const resolved = f.status === "resolved";
        html += '<article class="feedback-item"><div class="feedback-item__top">' +
            '<span class="tag' + (f.kind === "bug" ? " tag--danger" : " tag--info") + '">' + kindLabel(f.kind) + "</span>" +
            '<span class="tag' + (resolved ? " tag--success" : "") + '">' + (resolved ? icon("checkcircle") + "Resolved" : icon("clock") + "Open") + "</span>" +
            '<span class="chrono-badge">' + icon("calendar") + escapeHtml(f.date) + "</span>" +
            "</div><p>" + escapeHtml(f.text) + "</p></article>";
    }

    myList.innerHTML = html;
    noFeedback.hidden = mine.length > 0;
    noFeedback.textContent = "You haven't sent any suggestions or bug reports yet.";
}

if (adminView) {
    form.hidden = true;
    const note = document.createElement("p");
    note.className = "login-message";
    note.innerHTML = 'Submissions are reviewed in the <a href="admin.html#feedback">admin dashboard’s Feedback tab</a>.';
    form.replaceWith(note);
}

form.addEventListener("submit", function (event) {
    event.preventDefault();
    NeuUI.clearErrors(form);
    formMessage.hidden = true;

    const text = textInput.value.trim();
    if (text.length < 10) {
        NeuUI.fieldError(textInput, "Please write at least 10 characters.");
        formMessage.textContent = "Please write at least 10 characters before sending.";
        formMessage.hidden = false;
        textInput.focus();
        return;
    }

    const kind = (document.querySelector('input[name="kind"]:checked') || {}).value || "suggestion";
    const done = NeuUI.busy(form.querySelector('button[type="submit"]'), "Sending...");

    addFeedback(student, kind, text);
    feedback = loadFeedback();
    renderMine();

    form.reset();
    document.getElementById("kindSuggestion").checked = true;
    done();
    NeuUI.toast(kind === "bug" ? "Bug report sent" : "Suggestion sent", "success");
    NeuUI.announce("Your feedback was sent.");
});

function refreshFromStorage() {
    feedback = loadFeedback();
    renderRatingRow();
    renderMine();
}
window.addEventListener("storage", refreshFromStorage);
window.addEventListener("neucast:synced", refreshFromStorage);

renderRatingRow();
renderMine();
