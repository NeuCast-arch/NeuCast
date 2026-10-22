const message = $("loginMessage");

// Already logged in? Go to the right page
if (isLoggedIn()) {
    window.location.href = "admin.html";
} else if (getCurrentStudent()) {
    window.location.href = "index.html";
}

$("loginForm").addEventListener("submit", event => {
    event.preventDefault();

    const email = $("email").value.trim();
    const password = $("password").value;

    if (email === "" || password === "") {
        showMessage(message, "Please enter your email and password.", "error");
        return;
    }

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

    if (result.pending) {
        showMessage(message, "Your account is waiting for admin approval. Please try again later.", "error");
        return;
    }

    showMessage(message, "Incorrect email or password.", "error");
});