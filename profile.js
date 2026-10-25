// Typing in a field clears that field's error
function clearOnInput(form) {
    form.addEventListener("input", event => {
        const field = event.target.closest(".field");
        if (!field || !field.classList.contains("has-error")) return;
        field.classList.remove("has-error");
        event.target.removeAttribute("aria-invalid");
    });
}

// Only logged-in students can open this page
const student = getCurrentStudent();

if (!student) {
    window.location.href = "login.html";
} else {
    const profileForm = $("profileForm");
    const passwordForm = $("passwordForm");
    const profileMessage = $("profileMessage");
    const passwordMessage = $("passwordMessage");
    const newPassword = $("newPassword");

    fillSelect($("course"), COURSE_OPTIONS);
    fillSelect($("year"), YEAR_OPTIONS);
    NeuUI.passwordToggles(document);
    clearOnInput(profileForm);
    clearOnInput(passwordForm);

    // Show the student's current details
    $("fullName").value = student.name;
    $("studentId").value = student.id;
    $("email").value = student.email;
    $("course").value = student.course;
    $("year").value = student.year;

    // The details are in: swap the placeholder for the real form
    $("profileSkeleton").remove();
    const content = $("profileContent");
    content.hidden = false;
    content.classList.add("sk-fade-in");

    // ----- Save profile -----
    profileForm.addEventListener("submit", async event => {
        event.preventDefault();
        NeuUI.clearErrors(profileForm);

        const name = $("fullName").value.trim();
        if (name === "") {
            showMessage(profileMessage, "Please enter your full name.", "error");
            profileMessage.setAttribute("role", "alert");
            NeuUI.fieldError($("fullName"), "Please enter your full name.");
            $("fullName").focus();
            return;
        }

        const done = NeuUI.busy($("profileBtn"), "Saving...");
        await NeuUI.nextPaint();

        updateStudentProfile(student.id, { name: name, course: $("course").value, year: $("year").value });
        done();
        profileMessage.setAttribute("role", "status");
        showMessage(profileMessage, "Profile saved. You'll now see announcements for " + $("course").value + ".", "success");
        NeuUI.toast("Profile saved", "success");
    });

    // ----- Change password -----
    passwordForm.addEventListener("submit", async event => {
        event.preventDefault();
        NeuUI.clearErrors(passwordForm);

        const currentInput = $("currentPassword");
        const confirmInput = $("confirmNewPassword");
        const current = currentInput.value;
        const confirmed = confirmInput.value;

        const fail = (text, input) => {
            passwordMessage.setAttribute("role", "alert");
            showMessage(passwordMessage, text, "error");
            NeuUI.fieldError(input, text);
            input.focus();
        };

        if (current === "" || newPassword.value === "" || confirmed === "") {
            passwordMessage.setAttribute("role", "alert");
            showMessage(passwordMessage, "Please fill in all three password fields.", "error");
            const missing = [currentInput, newPassword, confirmInput].filter(input => input.value === "");
            missing.forEach(input => NeuUI.fieldError(input, "This field is required."));
            missing[0].focus();
            return;
        }
        if (newPassword.value.length < 6) {
            return fail("New password must be at least 6 characters.", newPassword);
        }
        if (newPassword.value !== confirmed) {
            return fail("The two new passwords don't match.", confirmInput);
        }
        if (newPassword.value === current) {
            return fail("Your new password must be different from the current one.", newPassword);
        }

        const done = NeuUI.busy($("passwordBtn"), "Changing password...");
        await NeuUI.nextPaint();

        const result = changeStudentPassword(student.id, current, newPassword.value);
        done();
        if (!result.ok) {
            return fail(result.error, currentInput);
        }

        passwordForm.reset();
        document.querySelectorAll(".pw-toggle[aria-pressed='true']").forEach(button => button.click());
        passwordMessage.setAttribute("role", "status");
        showMessage(passwordMessage, "Password changed.", "success");
        NeuUI.toast("Password changed", "success");
    });

    // ----- Log out -----
    $("logoutBtn").addEventListener("click", () => {
        studentLogOut();
        window.location.href = "login.html";
    });
}
