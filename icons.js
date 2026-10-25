// ===== Icons =====
// Each icon is a few simple lines drawn inside a 24 x 24 box.
const ICON_PATHS = {
    home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/><path d="M10 19.5v-5h4v5"/>',
    megaphone: '<path d="M3 10v4a1 1 0 0 0 1 1h3l8 4.5v-15L7 9H4a1 1 0 0 0-1 1z"/><path d="M18.5 9a4 4 0 0 1 0 6"/>',
    bell: '<path d="M6 16v-5a6 6 0 1 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><path d="M12 7.5v.01"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-6 8-6s8 2 8 6"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5"/><path d="M16 4.7a3.5 3.5 0 0 1 0 6.6"/><path d="M18 14.7c2 .7 3.5 2.3 3.5 5.3"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    checkcircle: '<circle cx="12" cy="12" r="9"/><path d="m8 12.5 3 3 5-6"/>',
    close: '<path d="M6 6l12 12"/><path d="M18 6 6 18"/>',
    sliders: '<path d="M4 7h10"/><path d="M18 7h2"/><circle cx="16" cy="7" r="2"/><path d="M4 17h2"/><path d="M10 17h10"/><circle cx="8" cy="17" r="2"/>',
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
    textsize: '<path d="M4 19 9 6l5 13"/><path d="M5.8 15h6.4"/><path d="M15 19l2.5-6 2.5 6"/><path d="M16 17h3"/>',
    list: '<path d="M8 6h12"/><path d="M8 12h12"/><path d="M8 18h12"/><path d="M4 6h.01"/><path d="M4 12h.01"/><path d="M4 18h.01"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    pin: '<path d="M9 3h6l-1 6 3.5 3.5h-11L10 9z"/><path d="M12 12.5V21"/>',
    alert: '<path d="M12 4 3 19.5h18z"/><path d="M12 10v4"/><path d="M12 17v.01"/>',
    cap: '<path d="M2 9 12 4l10 5-10 5z"/><path d="M6 11.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-4.5"/><path d="M22 9v6"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c3 3 3 15 0 18"/><path d="M12 3c-3 3-3 15 0 18"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17"/><path d="M8 3v4"/><path d="M16 3v4"/>',
    idcard: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M6 16c.5-1.5 1.7-2 3-2s2.5.5 3 2"/><path d="M15 10h3"/><path d="M15 14h3"/>',
    shield: '<path d="M12 3 4.5 6v5.5c0 4.5 3 7.7 7.5 9.5 4.5-1.8 7.5-5 7.5-9.5V6z"/><path d="m9 12 2.2 2.2L15.5 10"/>',
    hexagon: '<path d="M12 2.5 20 7v10l-8 4.5L4 17V7z"/>',
    neucast: '<path d="M10 3 17.5 7.5v9L10 21l-7.5-4.5v-9z"/><path d="M7 15.5v-7l6 7v-7"/><path d="M20 9.5a4 4 0 0 1 0 5"/><path d="M22 7.5a7 7 0 0 1 0 9"/>',     
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7"/><path d="M12 17v.01"/>',
    calculator: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8"/><path d="M8 12h.01"/><path d="M12 12h.01"/><path d="M16 12h.01"/><path d="M8 16h.01"/><path d="M12 16h.01"/><path d="M16 16h.01"/>',
    send: '<path d="M21 3 10 14"/><path d="M21 3l-7 18-4-7-7-4z"/>',
    arrowleft: '<path d="M19 12H5"/><path d="m11 6-6 6 6 6"/>',
    arrowright: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
    menu: '<path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/>',
    chevrondown: '<path d="m6 9 6 6 6-6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    inbox: '<path d="M3 13h5l1.5 3h5L16 13h5"/><path d="M5.5 5h13L21 13v6H3v-6z"/>',
    edit: '<path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17z"/><path d="m14.5 7.5 3 3"/>',
    logout: '<path d="M10 4H5v16h5"/><path d="M16 8l4 4-4 4"/><path d="M20 12H9"/>',
    plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
    trash: '<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/>'
};

// Returns an icon as HTML. Use it inside text, like: icon("home") + " Home"
function icon(name) {
    const paths = ICON_PATHS[name];

    if (!paths) {
        return "";
    }

    return '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">' + paths + "</svg>";
}

// Puts an icon into every element that has data-icon="name" in the HTML
function fillIcons() {
    const spots = document.querySelectorAll("[data-icon]");

    for (let i = 0; i < spots.length; i++) {
        spots[i].insertAdjacentHTML("afterbegin", icon(spots[i].dataset.icon));
    }
}

fillIcons();