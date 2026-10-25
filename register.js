const message = $("registerMessage");
const registerForm = $("registerForm");
const registerBtn = $("registerBtn");

fillSelect($("course"), COURSE_OPTIONS);
fillSelect($("year"), YEAR_OPTIONS);
NeuUI.passwordToggles(document);

// Typing in a field clears that field's error
function clearOnInput(form) {
    form.addEventListener("input", event => {
        const field = event.target.closest(".field");
        if (!field || !field.classList.contains("has-error")) return;
        field.classList.remove("has-error");
        event.target.removeAttribute("aria-invalid");
    });
}
clearOnInput(registerForm);

// Already logged in? Skip registration
if (getCurrentStudent()) {
    window.location.href = "index.html";
}

// Shows the red banner and marks one field
function fail(text, input) {
    message.setAttribute("role", "alert");
    showMessage(message, text, "error");
    if (input) {
        NeuUI.fieldError(input, text);
        input.focus();
    }
}

registerForm.addEventListener("submit", async event => {
    event.preventDefault();
    NeuUI.clearErrors(registerForm);
    message.hidden = true;

    const fields = {
        name: $("fullName"),
        id: $("studentId"),
        email: $("email"),
        course: $("course"),
        year: $("year"),
        password: $("password")
    };
    const info = {};
    Object.keys(fields).forEach(key => {
        info[key] = key === "password" ? fields[key].value : fields[key].value.trim();
    });

    const empty = Object.keys(fields).filter(key => info[key] === "");
    if (empty.length > 0) {
        message.setAttribute("role", "alert");
        showMessage(message, "Please fill in every field.", "error");
        empty.forEach(key => NeuUI.fieldError(fields[key], "This field is required."));
        fields[empty[0]].focus();
        return;
    }
    if (!info.email.includes("@") || !info.email.includes(".")) {
        return fail("Please enter a valid email address.", fields.email);
    }
    if (info.password.length < 6) {
        return fail("Password must be at least 6 characters.", fields.password);
    }
    if (info.password !== $("confirmPassword").value) {
        return fail("The two passwords don't match.", $("confirmPassword"));
    }

    // Show the spinner first: registering checks the shared database and can take a moment
    const done = NeuUI.busy(registerBtn, "Creating account...");
    await NeuUI.nextPaint();

    const result = registerStudent(info);
    done();

    if (!result.ok) {
        const input = /student ID/i.test(result.error) ? fields.id : fields.email;
        return fail(result.error, input);
    }

    // Registered, but not approved yet: no login until an admin approves the account
    registerForm.reset();
    document.querySelectorAll(".pw-toggle[aria-pressed='true']").forEach(button => button.click());
    message.setAttribute("role", "status");
    showMessage(message, "Registration sent! An admin must approve your account before you can log in.", "success");
    NeuUI.toast("Registration sent. Waiting for admin approval.", "success");
});
