// =====================================================
//  NeuCast shared UI helpers. Load right after icons.js, before data.js.
//
//    NeuUI.toast(text, "success" | "error" | "info")
//    NeuUI.announce(text)                    read aloud by screen readers, not shown
//    NeuUI.confirm({ title, message, confirmText, danger })  -> Promise<true | false>
//    NeuUI.busy(button, "Logging in...")     spinner on a button; returns done()
//    NeuUI.nextPaint()                       Promise that resolves after the screen has painted
//    NeuUI.passwordToggles(root)             Show / Hide on every password box
//    NeuUI.fieldError(input, text) / NeuUI.clearErrors(form)
//    NeuUI.greeting()   NeuUI.debounce(fn, ms)
//
//    NeuModal.open(modalElement, { trigger, initialFocus, onClose })
//    NeuModal.close(modalElement)    NeuModal.closeTop()
//
//    NeuSkeleton.html(kind, count, label)    kinds: notice, row, stat, ring, calendar
//    NeuSkeleton.show(container, kind, count, label)
//    NeuSkeleton.until(container, kind, count, label, work, { delay, min })
// =====================================================
(function () {
    "use strict";

    var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

    function visible(el) {
        return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    }

    // ---------- Live region and toasts ----------
    var live = null;
    var toastBox = null;

    function ensureRegions() {
        if (!document.body) return;
        if (!live) {
            live = document.createElement("div");
            live.className = "sr-only";
            live.setAttribute("role", "status");
            live.setAttribute("aria-live", "polite");
            live.setAttribute("aria-atomic", "true");
            document.body.appendChild(live);
        }
        if (!toastBox) {
            toastBox = document.createElement("div");
            toastBox.className = "toasts";
            toastBox.setAttribute("role", "region");
            toastBox.setAttribute("aria-label", "Notifications");
            document.body.appendChild(toastBox);
        }
    }

    function announce(text) {
        ensureRegions();
        if (!live) return;
        live.textContent = "";
        window.setTimeout(function () { live.textContent = text; }, 40);
    }

    function toast(text, type, options) {
        ensureRegions();
        if (!toastBox) return;
        options = options || {};
        type = type || "info";

        var el = document.createElement("div");
        el.className = "toast toast--" + type;
        el.setAttribute("role", type === "error" ? "alert" : "status");

        var label = document.createElement("span");
        label.textContent = text;
        el.appendChild(label);

        var closeBtn = document.createElement("button");
        closeBtn.type = "button";
        closeBtn.className = "toast__close";
        closeBtn.textContent = "Dismiss";
        el.appendChild(closeBtn);

        toastBox.appendChild(el);
        while (toastBox.children.length > 3) toastBox.removeChild(toastBox.firstChild);

        var timer = null;
        function remove() {
            window.clearTimeout(timer);
            el.classList.add("is-leaving");
            window.setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 240);
        }
        function start() { timer = window.setTimeout(remove, options.duration || (type === "error" ? 8000 : 4500)); }

        closeBtn.addEventListener("click", remove);
        el.addEventListener("mouseenter", function () { window.clearTimeout(timer); });
        el.addEventListener("mouseleave", start);
        el.addEventListener("focusin", function () { window.clearTimeout(timer); });
        el.addEventListener("focusout", start);
        start();
    }

    // ---------- Modals: focus trap, Escape, scroll lock, focus returns to the opener ----------
    var stack = [];

    function lockScroll() { document.body.classList.toggle("is-locked", stack.length > 0); }

    function open(modal, options) {
        if (!modal) return;
        options = options || {};

        var entry = { modal: modal, trigger: options.trigger || document.activeElement, onClose: options.onClose || null };
        stack = stack.filter(function (e) { return e.modal !== modal; });
        stack.push(entry);

        modal.hidden = false;
        lockScroll();

        var dialog = modal.querySelector('[role="dialog"], [role="alertdialog"]') || modal;
        if (!dialog.hasAttribute("tabindex")) dialog.setAttribute("tabindex", "-1");

        // The pop-up is already visible here, so focus can move right away
        var target = options.initialFocus
            ? (typeof options.initialFocus === "string" ? modal.querySelector(options.initialFocus) : options.initialFocus)
            : null;
        if (!target) {
            target = Array.prototype.filter.call(dialog.querySelectorAll(FOCUSABLE), visible)[0] || dialog;
        }
        target.focus();
    }

    function close(modal) {
        if (!modal || modal.hidden) return;
        var index = -1;
        for (var i = 0; i < stack.length; i++) if (stack[i].modal === modal) index = i;
        var entry = index >= 0 ? stack.splice(index, 1)[0] : null;

        modal.hidden = true;
        lockScroll();

        if (entry && entry.onClose) entry.onClose();
        // Focus goes back to the thing that opened the pop-up; if another pop-up is still open, back into it
        var back = entry && entry.trigger;
        if (back && document.contains(back) && typeof back.focus === "function") back.focus();
    }

    function closeTop() {
        if (stack.length) close(stack[stack.length - 1].modal);
    }

    document.addEventListener("keydown", function (event) {
        if (!stack.length) return;
        var top = stack[stack.length - 1].modal;

        if (event.key === "Escape") {
            event.preventDefault();
            close(top);
            return;
        }
        if (event.key !== "Tab") return;

        var items = Array.prototype.filter.call(top.querySelectorAll(FOCUSABLE), visible);
        if (items.length === 0) { event.preventDefault(); return; }
        var first = items[0];
        var last = items[items.length - 1];
        if (event.shiftKey && (document.activeElement === first || !top.contains(document.activeElement))) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !top.contains(document.activeElement))) {
            event.preventDefault();
            first.focus();
        }
    });

    // Click on the dimmed backdrop closes the top pop-up; any [data-close] button closes its pop-up
    document.addEventListener("mousedown", function (event) {
        if (!stack.length) return;
        var top = stack[stack.length - 1].modal;
        if (event.target === top) close(top);
    });
    document.addEventListener("click", function (event) {
        var button = event.target.closest ? event.target.closest("[data-close]") : null;
        if (!button) return;
        var modal = button.closest(".modal");
        if (modal) close(modal);
    });

    // ---------- Confirm dialog (replaces the browser's confirm()) ----------
    function confirmDialog(options) {
        options = options || {};
        return new Promise(function (resolve) {
            var id = "confirm" + Date.now();
            var modal = document.createElement("div");
            modal.className = "modal";
            modal.hidden = true;
            modal.innerHTML =
                '<div class="modal__dialog narrow" role="alertdialog" aria-modal="true" aria-labelledby="' + id + 't" aria-describedby="' + id + 'd">' +
                '<div class="modal__head"><h2 id="' + id + 't"></h2></div>' +
                '<div class="modal__body"><p id="' + id + 'd"></p></div>' +
                '<div class="modal__foot">' +
                '<button type="button" class="btn btn--secondary" data-answer="no"></button>' +
                '<button type="button" class="btn ' + (options.danger ? "btn--danger-solid" : "") + '" data-answer="yes"></button>' +
                "</div></div>";
            modal.querySelector("h2").textContent = options.title || "Are you sure?";
            modal.querySelector("p").textContent = options.message || "";
            modal.querySelector('[data-answer="no"]').textContent = options.cancelText || "Cancel";
            modal.querySelector('[data-answer="yes"]').textContent = options.confirmText || "Confirm";
            document.body.appendChild(modal);

            var answered = false;
            function finish(value) {
                if (answered) return;
                answered = true;
                close(modal);
                window.setTimeout(function () { if (modal.parentNode) modal.parentNode.removeChild(modal); }, 0);
                resolve(value);
            }
            modal.addEventListener("click", function (event) {
                var button = event.target.closest("[data-answer]");
                if (button) finish(button.dataset.answer === "yes");
            });
            open(modal, {
                trigger: document.activeElement,
                // For a destructive question the safe button (Cancel) gets focus first
                initialFocus: options.danger ? '[data-answer="no"]' : '[data-answer="yes"]',
                onClose: function () { finish(false); }
            });
        });
    }

    // ---------- Busy buttons ----------
    function busy(button, label) {
        if (!button) return function () {};
        var original = button.innerHTML;
        button.classList.add("is-busy");
        button.setAttribute("aria-busy", "true");
        button.setAttribute("aria-disabled", "true");
        if (label) button.textContent = label;
        return function done() {
            button.classList.remove("is-busy");
            button.removeAttribute("aria-busy");
            button.removeAttribute("aria-disabled");
            button.innerHTML = original;
        };
    }

    // Resolves once the browser has drawn the frame. Use before slow, blocking work.
    function nextPaint() {
        return new Promise(function (resolve) {
            window.requestAnimationFrame(function () { window.setTimeout(resolve, 0); });
        });
    }

    // ---------- Password show / hide ----------
    function passwordToggles(root) {
        var inputs = (root || document).querySelectorAll('input[type="password"]');
        Array.prototype.forEach.call(inputs, function (input) {
            if (input.parentNode.classList.contains("pw-wrap")) return;
            var wrap = document.createElement("div");
            wrap.className = "pw-wrap";
            input.parentNode.insertBefore(wrap, input);
            wrap.appendChild(input);

            var button = document.createElement("button");
            button.type = "button";
            button.className = "pw-toggle";
            button.textContent = "Show";
            button.setAttribute("aria-pressed", "false");
            button.setAttribute("aria-label", "Show password");
            wrap.appendChild(button);

            button.addEventListener("click", function () {
                var show = input.type === "password";
                input.type = show ? "text" : "password";
                button.textContent = show ? "Hide" : "Show";
                button.setAttribute("aria-pressed", String(show));
                button.setAttribute("aria-label", show ? "Hide password" : "Show password");
            });
        });
    }

    // ---------- Inline field errors ----------
    function fieldError(input, text) {
        if (!input) return;
        var field = input.closest(".field") || input.parentNode;
        field.classList.add("has-error");
        input.setAttribute("aria-invalid", "true");

        var error = field.querySelector(".field__error");
        if (!error) {
            error = document.createElement("p");
            error.className = "field__error";
            error.id = (input.id || "field") + "-error";
            field.appendChild(error);
        }
        error.textContent = text;
        var described = (input.getAttribute("aria-describedby") || "").split(" ").filter(Boolean);
        if (described.indexOf(error.id) < 0) described.push(error.id);
        input.setAttribute("aria-describedby", described.join(" "));
    }

    function clearErrors(form) {
        if (!form) return;
        Array.prototype.forEach.call(form.querySelectorAll(".has-error"), function (field) { field.classList.remove("has-error"); });
        Array.prototype.forEach.call(form.querySelectorAll('[aria-invalid="true"]'), function (input) { input.removeAttribute("aria-invalid"); });
    }

    function greeting() {
        var hour = new Date().getHours();
        if (hour < 12) return "Good morning";
        if (hour < 18) return "Good afternoon";
        return "Good evening";
    }

    function debounce(fn, ms) {
        var timer = null;
        return function () {
            var args = arguments;
            var self = this;
            window.clearTimeout(timer);
            timer = window.setTimeout(function () { fn.apply(self, args); }, ms);
        };
    }

    window.NeuUI = {
        toast: toast, announce: announce, confirm: confirmDialog, busy: busy, nextPaint: nextPaint,
        passwordToggles: passwordToggles, fieldError: fieldError, clearErrors: clearErrors,
        greeting: greeting, debounce: debounce
    };
    window.NeuModal = { open: open, close: close, closeTop: closeTop };

    // ---------- Skeleton loaders ----------
    var PARTS = {
        notice:
            '<div class="sk-notice" aria-hidden="true"><span class="sk sk-tile"></span><div>' +
            '<div class="sk-notice__meta"><span class="sk" style="width:5.5rem"></span><span class="sk" style="width:3.5rem"></span></div>' +
            '<span class="sk sk-line lg w-80"></span><span class="sk sk-line w-100"></span><span class="sk sk-line w-60"></span>' +
            '<div class="sk-notice__foot"><span class="sk sk-line w-30" style="margin:0"></span><span class="sk sk-pill" style="width:5rem;height:2rem"></span></div></div></div>',
        row:
            '<div class="sk-row" aria-hidden="true"><span class="sk sk-tile"></span><div><span class="sk sk-line w-60"></span><span class="sk sk-line w-40"></span></div></div>',
        stat:
            '<div class="sk-stat" aria-hidden="true"><span class="sk sk-circle"></span><div><span class="sk sk-line lg w-40"></span><span class="sk sk-line w-60"></span></div></div>',
        ring:
            '<div class="sk-ring" aria-hidden="true"><span class="sk sk-circle"></span><div><span class="sk sk-line w-60"></span><span class="sk sk-line w-40"></span></div></div>',
        calendar: function () {
            var cells = "";
            for (var i = 0; i < 35; i++) cells += '<span class="sk"></span>';
            return '<div class="sk-calendar" aria-hidden="true"><span class="sk sk-line w-40" style="margin:0 auto"></span><div class="sk-calendar__grid">' + cells + "</div></div>";
        }
    };

    function skeletonHtml(kind, count, label) {
        var part = PARTS[kind];
        var one = typeof part === "function" ? part() : part;
        var html = "";
        for (var i = 0; i < (count || 1); i++) html += one;
        return '<div class="sk-group" data-skeleton>' + html + '<span class="sk-status">' + (label || "Loading") + "...</span></div>";
    }

    function show(container, kind, count, label) {
        if (!container) return;
        container.setAttribute("aria-busy", "true");
        container.innerHTML = skeletonHtml(kind, count, label);
    }

    // Shows a skeleton only if the work takes longer than `delay` (so quick loads do not flash),
    // keeps it at least `min` ms once shown (so it does not blink), then resolves with the work's result.
    function until(container, kind, count, label, work, options) {
        options = options || {};
        var delay = options.delay === undefined ? 120 : options.delay;
        var min = options.min === undefined ? 320 : options.min;
        var shownAt = 0;
        var timer = window.setTimeout(function () {
            shownAt = Date.now();
            show(container, kind, count, label);
        }, delay);

        return Promise.resolve().then(work).then(function (value) {
            window.clearTimeout(timer);
            var wait = shownAt ? Math.max(0, min - (Date.now() - shownAt)) : 0;
            return new Promise(function (resolve) { window.setTimeout(function () { resolve(value); }, wait); });
        }).then(function (value) {
            if (container) container.setAttribute("aria-busy", "false");
            return value;
        });
    }

    window.NeuSkeleton = { html: skeletonHtml, show: show, until: until };

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ensureRegions);
    else ensureRegions();
})();
