// Only logged-in students can open this page
const student = getCurrentStudent();

if (!student) {
    window.location.href = "login.html";
} else {
    const profileMessage = $("profileMessage");
    const passwordMessage = $("passwordMessage");
    const newPassword = $("newPassword");

    fillSelect($("course"), COURSE_OPTIONS);
    fillSelect($("year"), YEAR_OPTIONS);

    // Show the student's current details
    $("fullName").value = student.name;
    $("studentId").value = student.id;
    $("email").value = student.email;
    $("course").value = student.course;
    $("year").value = student.year;

    // ----- Save profile -----
    $("profileForm").addEventListener("submit", event => {
        event.preventDefault();

        const name = $("fullName").value.trim();
        if (name === "") {
            showMessage(profileMessage, "Please enter your full name.", "error");
            return;
        }

        updateStudentProfile(student.id, { name: name, course: $("course").value, year: $("year").value });
        showMessage(profileMessage, "Profile saved. You'll now see announcements for " + $("course").value + ".", "success");
    });

    // ----- Change password -----
    $("passwordForm").addEventListener("submit", event => {
        event.preventDefault();

        const current = $("currentPassword").value;
        const confirmed = $("confirmNewPassword").value;
        const fail = text => showMessage(passwordMessage, text, "error");

        if (current === "" || newPassword.value === "" || confirmed === "") {
            return fail("Please fill in all three password fields.");
        }
        if (newPassword.value.length < 6) {
            return fail("New password must be at least 6 characters.");
        }
        if (newPassword.value !== confirmed) {
            return fail("The two new passwords don't match.");
        }
        if (newPassword.value === current) {
            return fail("Your new password must be different from the current one.");
        }

        const result = changeStudentPassword(student.id, current, newPassword.value);
        if (!result.ok) {
            return fail(result.error);
        }

        $("passwordForm").reset();
        showMessage(passwordMessage, "Password changed.", "success");
    });

    // ----- Log out -----
    $("logoutBtn").addEventListener("click", () => {
        studentLogOut();
        window.location.href = "login.html";
    });
}