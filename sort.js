/* =====================================================================
   Toolbar dropdown — "Sort by" in Split view, "Group by" in Board view.
   Click the link (or press Enter / Space / Arrow Down on it) to open the
   menu; pick an option to make it the new link text. Closes on outside
   click or Escape.

   Other scripts can swap the label and options with
   window.tvSort.configure(label, options, selected), and hear a pick via
   the "tvsortchange" event (detail: { label, value }).
   ================================================================== */
(function () {
  "use strict";

  function init() {
    var wrap = document.getElementById("tvSort");
    var label = document.getElementById("tvSortLabel");
    var btn = document.getElementById("tvSortBtn");
    var menu = document.getElementById("tvSortMenu");
    var value = document.getElementById("tvSortValue");
    if (!wrap || !btn || !menu) return;

    var focused = -1;

    function items() { return Array.prototype.slice.call(menu.querySelectorAll("li")); }

    function selectedIndex() {
      var list = items();
      for (var i = 0; i < list.length; i++) {
        if (list[i].getAttribute("aria-selected") === "true") return i;
      }
      return 0;
    }

    function setFocus(i) {
      var list = items();
      focused = (i + list.length) % list.length;
      list.forEach(function (li, j) { li.classList.toggle("is-focused", j === focused); });
    }

    function open() {
      menu.hidden = false;
      btn.setAttribute("aria-expanded", "true");
      setFocus(selectedIndex());
      menu.focus();
    }

    function close(returnFocus) {
      if (menu.hidden) return;
      menu.hidden = true;
      btn.setAttribute("aria-expanded", "false");
      items().forEach(function (li) { li.classList.remove("is-focused"); });
      if (returnFocus) btn.focus();
    }

    function choose(i) {
      var list = items();
      list.forEach(function (li, j) { li.setAttribute("aria-selected", j === i ? "true" : "false"); });
      var v = list[i].getAttribute("data-value");
      value.textContent = v;
      close(true);
      wrap.dispatchEvent(new CustomEvent("tvsortchange", {
        bubbles: true, detail: { label: label.textContent, value: v }
      }));
    }

    /* Replace the label and the option list. */
    function configure(text, options, selected) {
      close(false);
      label.textContent = text;
      menu.innerHTML = options.map(function (o) {
        var on = o === selected;
        return '<li role="option" aria-selected="' + on + '" data-value="' + o + '"><span>' + o +
               '</span><svg class="tv-i"><use href="#i-check"/></svg></li>';
      }).join("");
      value.textContent = selected;
    }

    window.tvSort = { configure: configure };

    btn.addEventListener("click", function () { menu.hidden ? open() : close(true); });
    btn.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") { e.preventDefault(); open(); }
    });

    // Delegated, so options swapped in by configure() work too.
    menu.addEventListener("click", function (e) {
      var li = e.target.closest("li");
      if (li) choose(items().indexOf(li));
    });
    menu.addEventListener("mousemove", function (e) {
      var li = e.target.closest("li");
      if (li) setFocus(items().indexOf(li));
    });

    menu.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") { e.preventDefault(); setFocus(focused + 1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setFocus(focused - 1); }
      else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choose(focused); }
      else if (e.key === "Escape" || e.key === "Tab") { close(e.key === "Escape"); }
    });

    document.addEventListener("click", function (e) {
      if (!wrap.contains(e.target)) close(false);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
