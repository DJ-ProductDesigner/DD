/* =====================================================================
   Board (Kanban) and Table views — high-level layouts only.

   Clicking "Board view" in the toolbar swaps the whole ticket area (list,
   conversation, thread, quick menu) for status columns. "Split view"
   brings the panes back. "Table view" shows the same tickets as rows and
   uses the same "Sort by" dropdown as Split view. Cards and rows are
   static for now: opening a ticket will go to a full-page conversation,
   which isn't built yet.
   ================================================================== */
(function () {
  "use strict";

  /* Columns, left to right. `tone` picks the header dot colour. */
  var COLUMNS = [
    { id: "new",      label: "New",                  tone: "warning" },
    { id: "progress", label: "In-progress",          tone: "info" },
    { id: "waiting",  label: "Waiting on Requester", tone: "muted" },
    { id: "resolved", label: "Resolved",             tone: "success" }
  ];

  /* Placeholder tickets — the same people as the list, plus a few more so
     each column has something in it. `owner` is "ai" or a person. */
  var TICKETS = [
    { id: "INC-1187", due: 45, col: "new",      who: "Daniel Okoro",  age: "25m", title: "MFA codes not arriving on new phone",        pri: "High",   owner: null },
    { id: "INC-1092", due: 240, col: "new",      who: "Jordan Liu",    age: "5h",  title: "PTO balance incorrect after policy update",  pri: "Medium", owner: null },
    { id: "INC-1120", due: 600, col: "new",      who: "Leo Park",      age: "6h",  title: "Request a Figma licence for new designer",   pri: "Low",    owner: null },

    { id: "INC-1041", due: 12, col: "progress", who: "Hannah Watts",  age: "2m",  title: "Lost access to Netsuite",                    pri: "Urgent", owner: "ai" },
    { id: "INC-1056", due: 90, col: "progress", who: "Marcus Bell",   age: "1h",  title: "VPN disconnects every 10 minutes on new laptop", pri: "High", owner: "maya" },
    { id: "INC-1101", due: 300, col: "progress", who: "Elena Torres",  age: "1d",  title: "Shared drive permissions lost after migration", pri: "High", owner: "ai" },
    { id: "INC-1126", due: 30, col: "progress", who: "Nina Rossi",    age: "1d",  title: "Laptop battery swelling",                    pri: "Urgent", owner: "maya" },

    { id: "INC-1078", due: 480, col: "waiting",  who: "Priya Sharma",  age: "3h",  title: "Building access badge for new joiner",       pri: "Medium", owner: "ai" },
    { id: "INC-1115", due: 720, col: "waiting",  who: "Sam Okafor",    age: "2d",  title: "Onboarding checklist missing for 3 new hires", pri: "Medium", owner: "maya" },
    { id: "INC-1131", due: 1440, col: "waiting",  who: "Omar Haddad",   age: "2d",  title: "Shared mailbox not syncing in Outlook",      pri: "Low",    owner: "ai" },

    { id: "INC-1033", due: null, col: "resolved", who: "Ravi Kumar",    age: "3d",  title: "Printer queue stuck on 3rd floor",           pri: "Low",    owner: "ai" },
    { id: "INC-1029", due: null, col: "resolved", who: "Aisha Bello",   age: "4d",  title: "Reset Okta MFA device",                      pri: "Medium", owner: "ai" }
  ];

  var PRI_TONE = { Urgent: "urgent", High: "high", Medium: "medium", Low: "low" };

  /* "Group by" options for the board. Each returns the columns and which
     column a ticket belongs in. Status is the default. */
  var GROUPINGS = {
    "Status": {
      columns: COLUMNS,
      key: function (t) { return t.col; }
    },
    "Priority": {
      columns: [
        { id: "Urgent", label: "Urgent", tone: "danger" },
        { id: "High",   label: "High",   tone: "warning" },
        { id: "Medium", label: "Medium", tone: "info" },
        { id: "Low",    label: "Low",    tone: "muted" }
      ],
      key: function (t) { return t.pri; }
    },
    "Assignee": {
      columns: [
        { id: "ai",   label: "Ticket Resolver",  tone: "highlight" },
        { id: "maya", label: "Maya Chen",  tone: "pink" },
        { id: "none", label: "Unassigned", tone: "muted" }
      ],
      key: function (t) { return t.owner || "none"; }
    }
  };
  var GROUP_OPTIONS = ["Status", "Priority", "Assignee"];
  var SORT_OPTIONS = ["Created date", "Urgency", "SLA breach risk", "Status"];

  /* ---- Table view helpers ------------------------------------- */
  var STATUS_LABEL = { new: "New", progress: "In-progress", waiting: "Waiting on Requester", resolved: "Resolved" };
  var STATUS_TAG = { new: "warning", progress: "info", waiting: "neutral", resolved: "success" };
  var STATUS_ORDER = { new: 0, progress: 1, waiting: 2, resolved: 3 };
  var PRI_ORDER = { Urgent: 0, High: 1, Medium: 2, Low: 3 };

  function ageMinutes(a) {
    var n = parseInt(a, 10);
    return /d/.test(a) ? n * 1440 : /h/.test(a) ? n * 60 : n;
  }

  function dueLabel(m) {
    if (m === null) return '<span class="tv-due is-done">&mdash;</span>';
    var txt = m < 60 ? m + "m" : m < 1440 ? Math.round(m / 60) + "h" : Math.round(m / 1440) + "d";
    var tone = m <= 30 ? " is-risk" : m <= 120 ? " is-soon" : "";
    return '<span class="tv-due' + tone + '">Due in ' + txt + "</span>";
  }

  /* The four "Sort by" options, applied to the table rows. */
  var SORTERS = {
    "Created date":    function (a, b) { return ageMinutes(a.age) - ageMinutes(b.age); },
    "Urgency":         function (a, b) { return PRI_ORDER[a.pri] - PRI_ORDER[b.pri]; },
    "SLA breach risk": function (a, b) {
      var x = a.due === null ? Infinity : a.due, y = b.due === null ? Infinity : b.due;
      return x - y;
    },
    "Status":          function (a, b) { return STATUS_ORDER[a.col] - STATUS_ORDER[b.col]; }
  };

  function ownerCell(owner) {
    return ownerChip(owner).replace("tv-bcard-owner", "tv-bcard-owner tv-tcell-owner");
  }

  function renderTable(host) {
    var rows = TICKETS.slice().sort(SORTERS[sortChoice] || SORTERS.Urgency);
    host.innerHTML =
      '<table class="tv-table">' +
        "<thead><tr>" +
          '<th scope="col">Ticket</th><th scope="col">Subject</th><th scope="col">Requester</th>' +
          '<th scope="col">Status</th><th scope="col">Priority</th><th scope="col">Assignee</th>' +
          '<th scope="col">SLA</th><th scope="col">Created</th>' +
        "</tr></thead><tbody>" +
        rows.map(function (t) {
          return '<tr tabindex="0">' +
            '<td class="tv-tcell-id">' + t.id + "</td>" +
            '<td class="tv-tcell-subject">' + t.title + "</td>" +
            "<td>" + t.who + "</td>" +
            '<td><span class="tv-tag tv-tag-' + STATUS_TAG[t.col] + '">' + STATUS_LABEL[t.col] + "</span></td>" +
            '<td><span class="tv-pri tv-pri-' + PRI_TONE[t.pri] + '">' + t.pri + "</span></td>" +
            "<td>" + ownerCell(t.owner) + "</td>" +
            "<td>" + dueLabel(t.due) + "</td>" +
            '<td class="tv-tcell-age">' + t.age + " ago</td>" +
          "</tr>";
        }).join("") +
      "</tbody></table>";
  }

  var groupChoice = "Status";   // remembered while switching views
  var sortChoice = "Urgency";
  var currentView = "split";

  function icon(name) {
    return '<svg class="tv-i" aria-hidden="true"><use href="#' + name + '"/></svg>';
  }

  function ownerChip(owner) {
    if (owner === "ai") {
      return '<span class="tv-bcard-owner"><span class="tv-av tv-av-ai tv-av-sm">' + icon("i-spark") +
             "</span>Ticket Resolver</span>";
    }
    if (owner === "maya") {
      return '<span class="tv-bcard-owner"><span class="tv-av tv-av-maya tv-av-sm">' +
             '<img src="maya-chen.png" alt="" /></span>Maya Chen</span>';
    }
    return '<span class="tv-bcard-owner is-empty">Unassigned</span>';
  }

  function card(t) {
    return '<article class="tv-bcard" tabindex="0" aria-label="' + t.id + ", " + t.title + '">' +
      '<div class="tv-bcard-meta"><span>' + t.id + '</span><span class="tv-row-sep">&bull;</span>' +
        "<span>" + t.who + '</span><span class="tv-bcard-age">' + t.age + " ago</span></div>" +
      '<h4 class="tv-bcard-title">' + t.title + "</h4>" +
      '<div class="tv-bcard-foot">' + ownerChip(t.owner) +
        '<span class="tv-pri tv-pri-' + PRI_TONE[t.pri] + '">' + t.pri + "</span></div>" +
    "</article>";
  }

  function render(host) {
    var g = GROUPINGS[groupChoice] || GROUPINGS.Status;
    host.innerHTML = g.columns.map(function (c) {
      var items = TICKETS.filter(function (t) { return g.key(t) === c.id; });
      return '<section class="tv-bcol" aria-label="' + c.label + '">' +
        '<header class="tv-bcol-head">' +
          '<span class="tv-bcol-dot tv-bcol-dot-' + c.tone + '"></span>' +
          '<h3 class="tv-bcol-title">' + c.label + "</h3>" +
          '<span class="tv-bcol-count">' + items.length + "</span>" +
        "</header>" +
        '<div class="tv-bcol-list">' + items.map(card).join("") + "</div>" +
      "</section>";
    }).join("");
  }

  /* View switching: "split" (the panes), "board" or "table". */
  function setView(view, root, host, table) {
    var board = view === "board";
    var isTable = view === "table";
    currentView = view;
    root.classList.toggle("is-board", board);
    root.classList.toggle("is-table", isTable);

    // The toolbar dropdown groups the columns in Board view and sorts in
    // Split and Table view (one shared "Sort by" choice for both).
    if (window.tvSort) {
      if (board) window.tvSort.configure("Group by:", GROUP_OPTIONS, groupChoice);
      else window.tvSort.configure("Sort by:", SORT_OPTIONS, sortChoice);
    }
    host.hidden = !board;
    table.hidden = !isTable;
    if (isTable) renderTable(table);
    if (board || isTable) root.classList.remove("is-thread-open");

    Array.prototype.forEach.call(root.querySelectorAll(".tv-viewtoggle [data-view]"), function (b) {
      var on = b.getAttribute("data-view") === view;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-pressed", String(on));
    });
  }

  function init() {
    var root = document.getElementById("tvRoot");
    var host = document.getElementById("tvBoard");
    var table = document.getElementById("tvTable");
    if (!root || !host || !table) return;
    render(host);

    ["split", "board", "table"].forEach(function (v) {
      root.querySelector('[data-view="' + v + '"]').addEventListener("click", function () {
        setView(v, root, host, table);
      });
    });

    document.addEventListener("tvsortchange", function (e) {
      if (currentView === "board") {
        groupChoice = e.detail.value;
        render(host);
      } else {
        sortChoice = e.detail.value;
        if (currentView === "table") renderTable(table);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
