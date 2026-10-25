// =====================================================
//  NeuCast theme: runs in the <head> so the page never flashes the wrong colors.
//  Reads the saved settings (neucast_settings) and sets two attributes on <html>:
//    data-theme = "light" | "dark"      (Settings > Appearance; "system" follows the device)
//    data-text  = "small" | "medium" | "large"
// =====================================================
(function () {
    var KEY = "neucast_settings";
    var root = document.documentElement;
    var media = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

    function read() {
        try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (error) { return {}; }
    }

    // "system", "light" or "dark". Old saved settings only had dark: true/false.
    function prefOf(settings) {
        if (settings.theme === "light" || settings.theme === "dark" || settings.theme === "system") return settings.theme;
        return settings.dark === true ? "dark" : "system";
    }

    function resolve(pref) {
        if (pref === "dark" || pref === "light") return pref;
        return media && media.matches ? "dark" : "light";
    }

    function apply(settings) {
        settings = settings || read();
        var theme = resolve(prefOf(settings));
        root.setAttribute("data-theme", theme);
        root.setAttribute("data-text", settings.textSize === "small" || settings.textSize === "large" ? settings.textSize : "medium");
        var meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute("content", theme === "dark" ? "#12151C" : "#F5F6F8");
    }

    apply();

    if (media && media.addEventListener) {
        media.addEventListener("change", function () { if (prefOf(read()) === "system") apply(); });
    }
    window.addEventListener("storage", function (event) { if (event.key === KEY) apply(); });

    window.NeuTheme = { apply: apply, prefOf: prefOf, read: read };
})();
