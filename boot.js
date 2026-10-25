// =====================================================
//  NeuCast boot loader.
//  The cloud-sync script downloads data in one blocking request when a page
//  opens, which freezes the screen. This loader lets the browser paint the
//  page (with its skeleton placeholders) FIRST, then loads the page's scripts
//  in the same order as before.
//
//    <script src="boot.js" data-scripts="icons.js ui.js cloud-config.js cloud.js data.js script.js"></script>
// =====================================================
(function () {
    var me = document.currentScript;
    var list = ((me && me.getAttribute("data-scripts")) || "").split(/\s+/).filter(Boolean);
    var started = false;

    function go() {
        if (started) return;
        started = true;
        var host = document.body || document.documentElement;
        list.forEach(function (src) {
            var script = document.createElement("script");
            script.src = src;
            script.async = false;   // keep the order
            host.appendChild(script);
        });
    }

    function afterPaint() {
        window.requestAnimationFrame(function () { window.setTimeout(go, 0); });
        window.setTimeout(go, 150);   // hidden tabs do not paint: do not wait for them
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", afterPaint);
    else afterPaint();
})();
