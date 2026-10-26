// =====================================================
//  Shared by the four feature pages: archive.html, feedback.html,
//  careers.html, safety.html. Handles who is viewing, the header's user
//  link, and the phone nav menu. Load after data.js, before the page's
//  own script.
// =====================================================

const student = getCurrentStudent();
const adminView = isLoggedIn();

if (!student && !adminView) {
    window.location.replace("login.html");
}

if (student) {
    document.getElementById("userName").textContent = student.name.split(" ")[0];
    document.getElementById("userSub").textContent = student.course;
    document.getElementById("userLink").href = "profile.html";
    document.getElementById("userLink").setAttribute("aria-label", "My profile: " + student.name);
} else {
    document.getElementById("userName").textContent = "Admin";
    document.getElementById("userSub").textContent = "Open dashboard";
    document.getElementById("userLink").href = "admin.html";
    document.getElementById("userLink").setAttribute("aria-label", "Open the admin dashboard");
}

const menuBtn = document.getElementById("menuBtn");
const mainNav = document.getElementById("mainNav");
if (menuBtn && mainNav) {
    menuBtn.addEventListener("click", function () {
        const open = mainNav.classList.toggle("is-open");
        menuBtn.setAttribute("aria-expanded", String(open));
    });
    mainNav.addEventListener("click", function (event) {
        if (event.target.closest("a, button")) {
            mainNav.classList.remove("is-open");
            menuBtn.setAttribute("aria-expanded", "false");
        }
    });
}
