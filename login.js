const message = $("loginMessage");
const loginForm = $("loginForm");
const loginBtn = $("loginBtn");

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
clearOnInput(loginForm);

// Already logged in? Go to the right page
if (isLoggedIn()) {
    window.location.href = "admin.html";
} else if (getCurrentStudent()) {
    window.location.href = "index.html";
}

// Shows the banner and marks the field that needs attention
function problem(text, input) {
    showMessage(message, text, "error");
    if (input) {
        NeuUI.fieldError(input, text);
        input.focus();
    }
}

loginForm.addEventListener("submit", async event => {
    event.preventDefault();
    NeuUI.clearErrors(loginForm);
    message.hidden = true;

    const emailInput = $("email");
    const passwordInput = $("password");
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (email === "" || password === "") {
        showMessage(message, "Please enter your email and password.", "error");
        if (email === "") NeuUI.fieldError(emailInput, "Please enter your email.");
        if (password === "") NeuUI.fieldError(passwordInput, "Please enter your password.");
        (email === "" ? emailInput : passwordInput).focus();
        return;
    }

    // Show the spinner first: the next calls check the shared database and can take a moment
    const done = NeuUI.busy(loginBtn, "Logging in...");
    await NeuUI.nextPaint();

    // Admin account
    if (checkLogin(email, password)) {
        logIn();
        window.location.href = "admin.html";
        return;
    }

    // Student account
    const result = loginStudent(email, password);

    if (result.ok) {
        studentLogIn(result.student.id);
        window.location.href = "index.html";
        return;
    }

    done();

    if (result.pending) {
        problem("Your account is waiting for admin approval. Please try again later.", emailInput);
        return;
    }

    problem("Incorrect email or password.", passwordInput);
});
