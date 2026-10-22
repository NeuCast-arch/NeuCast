const message = $("registerMessage");
const fail = text => showMessage(message, text, "error");

fillSelect($("course"), COURSE_OPTIONS);
fillSelect($("year"), YEAR_OPTIONS);

// Already logged in? Skip registration
if (getCurrentStudent()) {
    window.location.href = "index.html";
}

$("registerForm").addEventListener("submit", event => {
    event.preventDefault();

    const info = {
        name: $("fullName").value.trim(),
        id: $("studentId").value.trim(),
        email: $("email").value.trim(),
        course: $("course").value,
        year: $("year").value,
        password: $("password").value
    };

    if (Object.values(info).some(value => value === "")) {
        return fail("Please fill in every field.");
    }
    if (!info.email.includes("@") || !info.email.includes(".")) {
        return fail("Please enter a valid email address.");
    }
    if (info.password.length < 6) {
        return fail("Password must be at least 6 characters.");
    }
    if (info.password !== $("confirmPassword").value) {
        return fail("The two passwords don't match.");
    }

    const result = registerStudent(info);
    if (!result.ok) {
        return fail(result.error);
    }

    // Registered, but not approved yet: no login until an admin approves the account
    $("registerForm").reset();
    showMessage(message, "Registration sent! An admin must approve your account before you can log in.", "success");
});