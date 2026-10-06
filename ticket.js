/* =====================================================================
   Freshservice — INC-1041 "Lost access to Netsuite"

   The interaction from the Figma file, in six beats:

     1. In-progress   — Ticket Resolver has diagnosed the issue and proposed an
                        action. It is blocked on a policy it can't
                        override, so it hands the decision to a human.
     2. Discuss with AI — the agent (Maya Chen) opens a private thread.
     3. In progress   — Maya asks whether the policy can be side-stepped.
     4. AI answers with two options; Maya picks one; AI says "On it!".
     5. AI executes: delegated, Workday updated, Netsuite updated,
        checks back in with Hannah, status Waiting on Requester.
     6. Resolved      — Hannah confirms, AI resolves, Knowledge Curator
                        proposes a policy update.

   Driven by clicks. The messages Maya "types" are scripted, so you never
   have to type the exact copy during a demo: click into the thread
   composer (or hit Send) and the next line types itself.

   Press R, or use the small circle in the bottom-right corner, to start
   over.

   ---------------------------------------------------------------------
   BRAND LOGOS
   ---------------------------------------------------------------------
   Three small raster marks come from outside the Figma icon set. Drop the
   file into this folder and name it below — nothing else needs to change.
   Anything left as "" falls back to a neutral placeholder tile.

   The activity icons (assignment, status, AI response, hand-off, property
   edits, knowledge updates) are not in here — they're inlined straight
   into the icon sprite at the top of index.html.
   ================================================================== */

(function () {
  "use strict";

  /* When the ticket opened and when the Ticket Resolver closed it. Used as the
     message timestamps and for the "Resolved in N minutes" tag. */
  var OPENED_AT = "9:22 AM";
  var RESOLVED_AT = "9:35 AM";

  var ASSETS = {
    slack: "Slack.png",       // 16px mark on the bottom-right of an avatar
    workday: "Workday.png",   // 16px mark in "made updates in Workday"
    netsuite: "Netsuite.png"  // 16px mark in "made updates in Netsuite"
  };

  var PHOTOS = {
    hannah: "hannah-watts.png",
    maya: "maya-chen.png"
  };

  /* ------------------------------------------------------------------
     Small DOM helpers
     --------------------------------------------------------------- */

  function $(id) { return document.getElementById(id); }

  function node(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  function icon(name, cls) {
    return '<svg class="tv-i' + (cls ? " " + cls : "") + '"><use href="#' + name + '"/></svg>';
  }

  function mark(key) {
    var src = ASSETS[key];
    var style = src ? ' style="background-image:url(\'' + src + '\')"' : "";
    return '<span class="tv-appmark" data-asset="' + key + '-16"' + style + '></span>';
  }

  function badge() {
    var src = ASSETS.slack;
    var style = src ? ' style="background-image:url(\'' + src + '\')"' : "";
    return '<span class="tv-av-badge" data-asset="slack-16"' + style + '></span>';
  }

  /* Avatars. `size` is "" (24px) or "sm" (16px, used inside activity rows).
     People use their photo; the Ticket Resolver keeps the purple sparkle chip. */
  function avatar(who, size) {
    var sz = size === "sm" ? " tv-av-sm" : "";

    if (who === "wc") {
      return '<span class="tv-av tv-av-wc' + sz + '" role="img" aria-label="Workplace concierge"></span>';
    }

    if (who === "kw") {
      return '<span class="tv-av tv-av-kw' + sz + '">' + icon("i-knowledge-update") + "</span>";
    }

    if (who === "ai") {
      return '<span class="tv-av tv-av-ai' + sz + '">' + icon("i-spark") +
             (size === "sm" ? "" : badge()) + "</span>";
    }

    /* Software Handler messages Hannah directly too, so it carries the
       same Slack badge as Ticket Resolver at full size. */
    if (who === "sh") {
      return '<span class="tv-av tv-av-sh' + sz + '">' + icon("i-spark") +
             (size === "sm" ? "" : badge()) + "</span>";
    }

    var tone = who === "maya" ? " tv-av-maya" : " tv-av-hannah";
    var name = PEOPLE[who] ? PEOPLE[who].name : "";
    var photo = PHOTOS[who]
      ? '<img src="' + PHOTOS[who] + '" alt="' + name + '" />'
      : "";

    return '<span class="tv-av' + tone + sz + '">' + photo +
           (size === "sm" ? "" : badge()) + "</span>";
  }

  /* ------------------------------------------------------------------
     Renderers — one per item type in the timeline
     --------------------------------------------------------------- */

  var PEOPLE = {
    ai:     { name: "Ticket Resolver",    kind: "ai" },
    sh:     { name: "Software Handler",   kind: "ai" },
    hannah: { name: "Hannah Watts", kind: "human" },
    maya:   { name: "Maya Chen",    kind: "human" }
  };

  function renderMessage(item) {
    var p = PEOPLE[item.who];
    var n = node("div", "tv-msg is-" + p.kind);
    n.innerHTML =
      '<div class="tv-msg-head">' + avatar(item.who) +
        '<span class="tv-msg-name">' + p.name + "</span>" +
        '<span class="tv-msg-time">' + item.time + "</span>" +
      "</div>" +
      '<div class="tv-msg-body">' + item.body + "</div>";
    return n;
  }

  function renderActivity(item) {
    return node("div", "tv-act",
      icon(item.icon) + '<span class="tv-act-text">' + item.body + "</span>");
  }

  /* ------------------------------------------------------------------
     Agent states (adapted from beautifului.dev)
     --------------------------------------------------------------- */

  /* 01 — Loading state. `label` is the verb the agent is doing right now;
     the elapsed counter runs until the node is removed. */
  function renderLoader(label) {
    var n = node("span", "tv-loader");
    n.innerHTML =
      '<span class="tv-loader-grid">' + new Array(10).join("<i></i>") + "</span>" +
      '<span class="tv-loader-label">' + label + "</span>" +
      '<span class="tv-loader-time">0.0s</span>';

    var out = n.querySelector(".tv-loader-time");
    var t0 = Date.now();
    var tick = setInterval(function () {
      if (!n.isConnected) { clearInterval(tick); return; }
      out.textContent = ((Date.now() - t0) / 1000).toFixed(1) + "s";
    }, 100);
    intervals.push(tick);

    return n;
  }

  /* An AI bubble whose body is a loading state rather than a message. */
  function renderThinkingBubble(label) {
    var n = node("div", "tv-msg is-ai");
    n.innerHTML =
      '<div class="tv-msg-head">' + avatar("ai") +
        '<span class="tv-msg-name">Ticket Resolver</span>' +
      "</div>";
    var body = node("div", "tv-msg-body");
    body.appendChild(renderLoader(label));
    n.appendChild(body);
    return n;
  }

  /* 02 — Thinking trace. `variant` is "reasoning" (first-person notes) or
     "steps" (what it did, with the tool it used). Collapsed by default. */
  function renderTrace(item) {
    var n = node("div", "tv-trace");

    var inner;
    if (item.variant === "steps") {
      inner = '<ul class="tv-trace-steps">' + item.steps.map(function (s) {
        return "<li>" + icon("i-check") + "<span>" + s[0] + "</span>" +
               (s[1] ? "<code>" + s[1] + "</code>" : "") + "</li>";
      }).join("") + "</ul>";
    } else {
      inner = '<div class="tv-trace-reason">' +
              item.notes.map(function (p) { return "<p>" + p + "</p>"; }).join("") +
              "</div>";
    }

    if (item.link) {
      /* Label + a link to the thing it's about + the caret. The link can't
         live inside the toggle button, so the row is: [icon label] [link] [caret],
         with both the label and the caret toggling the details. */
      n.innerHTML =
        '<div class="tv-trace-row">' +
          '<button type="button" class="tv-trace-head" aria-expanded="false">' +
            icon(item.icon || "i-ai-response") + "<span>" + item.label + "</span>" +
          "</button>" +
          '<a href="#" class="tv-trace-link">' + item.link.label + icon("i-external") + "</a>" +
          '<button type="button" class="tv-trace-head tv-trace-caret-btn" aria-label="Show details" aria-expanded="false">' +
            icon("i-chevron-down", "tv-trace-caret") +
          "</button>" +
        "</div>" +
        '<div class="tv-trace-body"><div>' + inner + "</div></div>";

      n.querySelector(".tv-trace-link").addEventListener("click", function (e) {
        e.preventDefault();
        item.link.open();
      });
    } else {
      n.innerHTML =
        '<button type="button" class="tv-trace-head" aria-expanded="false">' + icon(item.icon || "i-ai-response") +
          "<span>" + item.label + "</span>" +
          icon("i-chevron-down", "tv-trace-caret") +
        "</button>" +
        '<div class="tv-trace-body"><div>' + inner + "</div></div>";
    }

    var toggles = n.querySelectorAll(".tv-trace-head");
    Array.prototype.forEach.call(toggles, function (b) {
      b.addEventListener("click", function () {
        var open = n.classList.toggle("is-open");
        Array.prototype.forEach.call(toggles, function (t) { t.setAttribute("aria-expanded", String(open)); });
        later(scrollConv, 300);
      });
    });

    return n;
  }

  /* 06 — Task rows. Each starts pending, flips to running, then done. */
  function renderTasks(item) {
    var n = node("div", "tv-tasks");

    if (item.header) {
      n.appendChild(renderActivity({ icon: "i-edit-properties", body: item.header }));
    }

    var rows = node("div", "tv-tasks-rows");
    rows.innerHTML = item.tasks.map(function (t, i) {
      return '<div class="tv-task is-pending" data-i="' + i + '">' +
               '<span class="tv-task-badge">' + (i + 1) + "</span>" +
               '<span class="tv-task-name">' + t.name + "</span>" +
               '<span class="tv-task-meta">' + (t.meta || "") + "</span>" +
               '<span class="tv-task-pill">Queued</span>' +
             "</div>";
    }).join("");
    n.appendChild(rows);

    // Walk the list: run each task for its own duration, then tick it off.
    var clock = 260;
    item.tasks.forEach(function (t, i) {
      var row = rows.children[i];
      var run = t.runFor || 1100;

      later(function () {
        row.className = "tv-task is-running";
        var pill = row.querySelector(".tv-task-pill");
        pill.textContent = "";
        pill.appendChild(renderLoader(t.running || "Working"));
        scrollConv();
      }, clock);

      later(function () {
        row.className = "tv-task is-done";
        row.querySelector(".tv-task-badge").innerHTML = icon("i-check");
        row.querySelector(".tv-task-pill").textContent = "Completed";
      }, clock + run);

      clock += run + 220;
    });

    n.setAttribute("data-runtime", clock);
    return n;
  }

  /* 10 — Context cards: the policy chunks the answer was grounded in. */
  function renderContext(chunks) {
    var n = node("div", "tv-ctx");
    n.innerHTML =
      '<button type="button" class="tv-ctx-toggle">' + icon("i-chunk") +
        "<span>" + chunks.length + " source" + (chunks.length === 1 ? "" : "s") + "</span>" +
        icon("i-chevron-down", "tv-trace-caret") +
      "</button>" +
      '<div class="tv-ctx-body"><div><div class="tv-ctx-list">' +
        chunks.map(function (c) {
          return '<div class="tv-ctx-card">' +
                   '<div class="tv-ctx-card-head">' + icon("i-chunk") + c.title +
                     "<span>" + c.body.replace(/<[^>]+>/g, "").length + " characters</span>" +
                   "</div>" +
                   "<p>" + c.body + "</p>" +
                   '<span class="tv-ctx-src"><b class="' + (c.kind === "PDF" ? "" : "is-doc") + '">' +
                     c.kind + "</b>" + c.source + "</span>" +
                 "</div>";
        }).join("") +
      "</div></div></div>";

    n.querySelector(".tv-ctx-toggle").addEventListener("click", function () {
      n.classList.toggle("is-open");
      later(scrollConv, 300);
    });

    return n;
  }

  /* 03 — Streaming text. Renders the real markup, blanks every text node,
     then refills them word by word so bold, links and lists survive. */
  function streamInto(host, html, scroll, onDone) {
    host.innerHTML = html;

    var walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT, null);
    var parts = [];
    var t;
    while ((t = walker.nextNode())) {
      if (t.nodeValue.trim()) parts.push({ node: t, full: t.nodeValue });
    }
    parts.forEach(function (p) { p.node.nodeValue = ""; });

    var caret = node("span", "tv-stream-caret");
    var pi = 0;
    var ci = 0;

    (function step() {
      if (pi >= parts.length) {
        if (caret.parentNode) caret.parentNode.removeChild(caret);
        onDone && onDone();
        return;
      }

      var p = parts[pi];

      // advance to the end of the next word
      var next = p.full.indexOf(" ", ci + 1);
      ci = next === -1 ? p.full.length : next;
      p.node.nodeValue = p.full.slice(0, ci);

      if (p.node.parentNode) p.node.parentNode.appendChild(caret);

      if (ci >= p.full.length) { pi += 1; ci = 0; }

      if (scroll) scroll();
      later(step, 26 + Math.random() * 34);
    })();
  }

  /* The AI summary card. `variant` is "conv" (in the conversation, with a
     footer) or "thread" (pinned at the top of the thread panel). */
  function renderCard(variant) {
    var n = node("div", "tv-card");
    if (variant === "conv") n.id = "tvCard";

    /* Author row, same as a chat message, so it's clear the Ticket Resolver wrote
       this. No Slack badge: the summary is internal, not sent over Slack. */
    n.innerHTML =
      '<div class="tv-card-top">' +
        '<div class="tv-msg-head tv-card-author">' +
          '<span class="tv-av tv-av-ai">' + icon("i-spark") + "</span>" +
          '<span class="tv-msg-name">Ticket Resolver</span>' +
          '<span class="tv-msg-time">9:26 AM</span>' +
        "</div>" +
        '<div class="tv-card-head">' +
          '<span class="tv-tag tv-tag-highlight tv-tag-private" title="Only visible to agents. Hannah can\u2019t see this.">' + icon("i-lock") +
            'Ticket summary<span class="tv-sr">, only visible to agents</span></span>' +
          '<h3 class="tv-card-title">Lost access to Netsuite</h3>' +
        "</div>" +
      "</div>" +
      '<div class="tv-card-content">' +
        '<div class="tv-card-sec"><h4>Issue</h4><p>Hannah&rsquo;s unable to access NetSuite ' +
          "after returning from ~3 months of personal leave. She had access before her leave.</p></div>" +
        '<div class="tv-card-sec"><h4>Root cause</h4><p>Workday shows ' +
          '<span class="tv-link">Hannah&rsquo;s worker status</span> as <strong>On Extended Leave</strong>. ' +
          'The <span class="tv-link" data-policy role="link" tabindex="0">Extended Leave Access Policy</span> says core application access ' +
          "such as Netsuite are to be disabled, while an employee is on an extended leave.</p></div>" +
        '<div class="tv-card-sec"><h4>Action</h4><p>Would you like me to update Hannah&rsquo;s ' +
          "Workday status to <strong>Active</strong> and then restore her NetSuite access?</p>" +
          (variant === "conv"
            ? '<div class="tv-card-approve-row" id="tvApproveRow">' +
                '<button type="button" class="tv-btn-primary" id="tvApprove">Approve &amp; restore access</button>' +
              "</div>"
            : "") +
        "</div>" +
      "</div>" +
      (variant === "conv" ? '<div class="tv-card-foot" id="tvCardFoot"></div>' : "");

    // Ground the root cause in the policy chunks it was drawn from.
    n.querySelector(".tv-card-content").appendChild(renderContext(POLICY_CHUNKS));

    // The approve button sits with the Action text now, not the footer, so
    // it's wired once here rather than every time the footer is swapped.
    if (variant === "conv") {
      n.querySelector("#tvApprove").addEventListener("click", onApprove);
    }

    return n;
  }

  /* Once Maya approves, or starts a discussion instead, the "Approve &
     restore access" button is no longer a live option — hide it rather
     than leave a stale button next to the outcome. */
  function disableApprove() {
    var row = $("tvApproveRow");
    if (row) row.hidden = true;
  }

  /* Resolution note — built like the AI summary card (author row, tag,
     title, rich-text sections) but editable: "Edit" turns the title and body into a
     rich-text field with Save / Cancel. Saving stamps "Edited by Maya Chen". */
  /* Step 1 depends on how Maya decided: she either approved straight from
     the summary card, or talked it through with the AI in the thread first. */
  var decisionPath = "approve";   // set by runTail: "approve" | "discuss"

  function noteHtml() {
    var step1 = decisionPath === "discuss"
      ? "Maya Chen reviewed the options with the Ticket Resolver and authorised the Workday change."
      : "Maya Chen approved the proposed fix from the ticket summary.";
    return NOTE_HTML.replace("{{STEP1}}", step1);
  }

  var NOTE_HTML =
    '<h3 class="tv-card-title">How INC-1041 was resolved</h3>' +
    '<div class="tv-card-sec"><h4>Resolution</h4><p>Restored Hannah&rsquo;s NetSuite access. ' +
      "She confirmed she can sign in again.</p></div>" +
    '<div class="tv-card-sec"><h4>Root cause</h4><p>Hannah&rsquo;s Workday status was still ' +
      "<strong>On Extended Leave</strong> after she returned, so the " +
      '<span class="tv-link" data-policy role="link" tabindex="0">Extended Leave Access Policy</span> kept her NetSuite licence revoked.</p></div>' +
    '<div class="tv-card-sec"><h4>Steps taken</h4><ol>' +
      "<li>{{STEP1}}</li>" +
      "<li>Updated Workday worker status from On Extended Leave to <strong>Active</strong>.</li>" +
      "<li>Reinstated the NetSuite licence (Finance &mdash; Accounts Payable role).</li>" +
      "<li>Verified sign-in through SSO, then confirmed with Hannah.</li>" +
    "</ol></div>" +
    '<div class="tv-card-sec"><h4>Follow-up</h4><p>Proposed an addition to the Extended Leave ' +
      "Access Policy covering who can approve early reinstatement, citing this ticket.</p></div>";

  function renderNote() {
    var n = node("div", "tv-card tv-note");
    n.innerHTML =
      '<div class="tv-card-top">' +
        '<div class="tv-msg-head tv-card-author">' +
          '<span class="tv-av tv-av-ai">' + icon("i-spark") + "</span>" +
          '<span class="tv-msg-name">Ticket Resolver</span>' +
          '<span class="tv-msg-time">9:35 AM</span>' +
          '<span class="tv-note-edited" hidden>&middot; Edited by Maya Chen</span>' +
          '<button type="button" class="tv-btn tv-btn-sm tv-note-edit">' + icon("i-pencil") + "Edit</button>" +
        "</div>" +
        '<div class="tv-card-head">' +
          '<span class="tv-tag tv-tag-success tv-tag-private" title="Only visible to agents. Hannah can\u2019t see this.">' + icon("i-lock") +
            'Resolution note<span class="tv-sr">, only visible to agents</span></span>' +
        "</div>" +
      "</div>" +
      '<div class="tv-card-content tv-note-body" aria-label="Resolution note">' + noteHtml() + "</div>" +
      '<div class="tv-card-foot tv-note-foot" hidden>' +
        '<button type="button" class="tv-btn-primary tv-note-save">Save note</button>' +
        '<button type="button" class="tv-btn tv-note-cancel">Cancel</button>' +
      "</div>";

    var body = n.querySelector(".tv-note-body");
    var foot = n.querySelector(".tv-note-foot");
    var edit = n.querySelector(".tv-note-edit");
    var stamp = n.querySelector(".tv-note-edited");
    var saved = body.innerHTML;

    function setEditing(on) {
      n.classList.toggle("is-editing", on);
      body.contentEditable = on ? "true" : "false";
      foot.hidden = !on;
      edit.hidden = on;
      if (on) {
        body.focus();
        // Put the caret at the end rather than selecting everything.
        var r = document.createRange();
        r.selectNodeContents(body);
        r.collapse(false);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(r);
      }
      later(scrollConv, 60);
    }

    edit.addEventListener("click", function () { setEditing(true); });

    n.querySelector(".tv-note-save").addEventListener("click", function () {
      if (body.innerHTML !== saved) {
        saved = body.innerHTML;
        stamp.hidden = false;
      }
      setEditing(false);
    });

    n.querySelector(".tv-note-cancel").addEventListener("click", function () {
      body.innerHTML = saved;
      setEditing(false);
    });

    body.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { body.innerHTML = saved; setEditing(false); }
    });

    return n;
  }

  /* ------------------------------------------------------------------
     Policy page — opened from the Knowledge Curator row. A side sheet over
     the app showing the policy with the proposed addition highlighted,
     so the agent can see exactly what would change and why.
     --------------------------------------------------------------- */
  var policyEl = null;
  var policyReturn = null;

  function buildPolicy() {
    var el = node("div", "tv-policy");
    el.hidden = true;
    el.innerHTML =
      '<div class="tv-policy-scrim"></div>' +
      '<section class="tv-policy-sheet" role="dialog" aria-modal="true" aria-labelledby="tvPolicyTitle" tabindex="-1">' +
        '<header class="tv-policy-top">' +
          '<span class="tv-policy-crumbs">Knowledge base &rsaquo; IT policies</span>' +
          '<button type="button" class="tv-iconbtn-plain tv-policy-close" aria-label="Close policy">' + icon("i-close") + "</button>" +
        "</header>" +
        '<div class="tv-policy-scroll">' +
          '<h2 class="tv-policy-title" id="tvPolicyTitle">Extended Leave Access Policy</h2>' +
          '<p class="tv-policy-meta">IT-Access-Policy-v4.pdf &middot; Owner: People Ops &middot; Last updated 12 Mar 2026</p>' +

          '<div class="tv-policy-banner">' + icon("i-knowledge-update") +
            "<div><strong>1 proposed change</strong> from the Knowledge Curator, awaiting People Ops review. " +
            "Raised from <strong>INC-1041</strong> (Hannah Watts, lost NetSuite access after leave).</div>" +
          "</div>" +

          '<div class="tv-policy-doc">' +
            "<h3>1. Purpose</h3>" +
            "<p>Protect company systems while a worker is away for an extended period, and make sure access " +
              "comes back promptly and safely when they return.</p>" +

            "<h3>2. Application access during extended leave</h3>" +
            "<p>Core application access &mdash; including NetSuite, Coupa and Workday self-service &mdash; is " +
              "revoked for any worker whose status is <strong>On Extended Leave</strong>, and is restored only once " +
              "that status returns to <strong>Active</strong>.</p>" +

            "<h3>3. Return from leave</h3>" +
            "<p><b>3.1</b> A returning worker&rsquo;s Workday status must be set back to Active by the people team or an " +
              "authorised delegate before downstream entitlements are reinstated.</p>" +
            "<p><b>3.2</b> Access tooling must not reinstate entitlements while the leave status stands.</p>" +

            '<div class="tv-policy-add">' +
              '<span class="tv-policy-add-tag">' + icon("i-knowledge-update") + "Proposed addition</span>" +
              "<p><b>3.3 Early reinstatement.</b> If a returning worker needs access before People Ops has updated " +
                "their Workday status, the IT agent assigned to their ticket may authorise the Ticket Resolver to set the " +
                "status to Active and restore entitlements. The agent&rsquo;s approval must be recorded on the ticket, " +
                "and People Ops is notified the same day.</p>" +
              '<p class="tv-policy-why"><strong>Why:</strong> In INC-1041 the Ticket Resolver couldn&rsquo;t override &sect;3.1, ' +
                "so the ticket waited on an agent decision the policy didn&rsquo;t cover. This makes that path explicit.</p>" +
            "</div>" +
          "</div>" +
        "</div>" +
      "</section>";

    document.body.appendChild(el);
    el.querySelector(".tv-policy-scrim").addEventListener("click", closePolicy);
    el.querySelector(".tv-policy-close").addEventListener("click", closePolicy);
    el.addEventListener("keydown", function (e) { if (e.key === "Escape") closePolicy(); });
    return el;
  }

  function openPolicy() {
    policyEl = policyEl || buildPolicy();
    policyReturn = document.activeElement;
    policyEl.hidden = false;
    requestAnimationFrame(function () {
      policyEl.classList.add("is-open");
      policyEl.querySelector(".tv-policy-sheet").focus();
    });
  }

  function closePolicy() {
    if (!policyEl || policyEl.hidden) return;
    policyEl.classList.remove("is-open");
    setTimeout(function () { policyEl.hidden = true; }, 220);
    if (policyReturn && policyReturn.focus) policyReturn.focus();
  }

  /* The card footer swaps between two action buttons and a comment chip. */
  /* Option A from the design review: Approve stays first and solid; a lean
     comment field fills the rest of the row, with "Ask AI" tucked inside
     its right edge. Typing and hitting Discuss opens the AI thread. */
  function cardFootActions() {
    return '<div class="tv-ask" id="tvAsk">' +
             '<textarea id="tvAskInput" rows="2" placeholder="Ask a question or suggest a change\u2026" ' +
               'aria-label="Ask the Ticket Resolver a question or suggest a change"></textarea>' +
             '<button type="button" class="tv-ask-send" id="tvAskSend" disabled>Ask AI</button>' +
           "</div>";
  }

  /* Shows who's actually said something in the thread — not just a count
     — as a small stack of their avatars, so the agent can tell at a
     glance whether it's just Maya or Maya and the AI both. */
  function cardFootChip(count, participants) {
    var avatars = (participants || []).map(function (who) {
      return avatar(who, "sm");
    }).join("");
    return '<button type="button" class="tv-chip tv-chip-thread" id="tvChip">' +
             '<span class="tv-chip-avatars">' + avatars + "</span>" +
             '<span class="tv-chip-count">' + count + (count === 1 ? " comment" : " comments") + "</span>" +
             icon("i-chevron-down", "tv-chip-chevron") +
           "</button>";
  }

  /* ------------------------------------------------------------------
     Content
     --------------------------------------------------------------- */

  /* Everything that has already happened when the agent opens the ticket
     — the "Full conversation" frame, scrolled to the bottom. */
  /* The two policy chunks the diagnosis was grounded in. */
  var POLICY_CHUNKS = [
    { title: "Extended leave — application access",
      kind: "PDF",
      source: "IT-Access-Policy-v4.pdf",
      body: "Core application access &mdash; including NetSuite, Coupa and Workday self-service &mdash; " +
            "is revoked for any worker whose status is <strong>On Extended Leave</strong>, and is restored " +
            "only once that status returns to <strong>Active</strong>." },
    { title: "Return from leave — reinstatement",
      kind: "DOC",
      source: "People-Ops Runbook &rsaquo; Returning workers",
      body: "A returning worker&rsquo;s Workday status must be set back to Active by the people team or an " +
            "authorised delegate before downstream entitlements are reinstated. Access tooling must not " +
            "reinstate entitlements while the leave status stands." }
  ];

  var HISTORY = [
    { type: "msg", who: "hannah", time: OPENED_AT,
      body: "<p>Hi team, I&rsquo;m unable to access my NetSuite account. Could someone help me with this?</p>" },

    { type: "act", icon: "i-assigned-agent",
      body: avatar("wc", "sm") + " <strong>Workplace concierge</strong> assigned it to " + avatar("sh", "sm") + " <strong>Software Handler</strong>" },

    { type: "act", icon: "i-status",
      body: "<strong>Software Handler</strong> changed status to <strong>In-progress</strong>" },

    /* Was a one-line "thought for 3s" row — now the reasoning behind it. */
    { type: "trace", variant: "reasoning", label: "Thought for 3 seconds", icon: "i-thinking",
      notes: [
        "She says she&rsquo;s lost access rather than forgotten a password, so this is more likely a provisioning state than a login failure. I shouldn&rsquo;t reset anything yet.",
        "Before I touch entitlements I need to know when it started and whether she ever had access &mdash; that separates a revocation from an account that was never set up.",
        "Three questions should be enough. Asking more than that up front tends to stall the thread."
      ] },

    { type: "msg", who: "sh", time: "9:23 AM",
      body: "<p>Hi Hannah, I can help with that. A couple of quick questions so I can look into it:</p>" +
            '<ul><li>&bull; When did you first notice you couldn&rsquo;t access NetSuite?</li>' +
            "<li>&bull; What happens when you try to log in? Do you see an error message?</li>" +
            "<li>&bull; Were you able to access NetSuite before this happened?</li></ul>" },

    { type: "msg", who: "hannah", time: "9:25 AM",
      body: "<p>I was away on personal leave for about 3 months. Today was my first day back in the office, " +
            "and when I tried to log in, I couldn&rsquo;t access my account.</p>" +
            "<p>I was able to use NetSuite before I went on leave.</p>" },

    { type: "msg", who: "sh", time: "9:26 AM",
      body: "<p>Thanks, Hannah. I&rsquo;ll check what&rsquo;s affecting your access and see if I can get it restored.</p>" },

    /* Was a one-line "generated summary" row — now the work behind it. */
    { type: "trace", variant: "steps", label: "Looked into it for 11 seconds", icon: "i-lookup",
      steps: [
        ["Read the Slack thread", "4 messages"],
        ["Looked up Hannah Watts in Workday", "worker &middot; 1 record"],
        ["Read worker status history", "2 changes since Jun"],
        ["Checked NetSuite provisioning", "no active licence"],
        ["Searched IT policies", "1 of 214 matched"],
        ["Blocked by policy &mdash; can&rsquo;t self-approve", ""]
      ] },

    /* Software Handler can diagnose the issue but can't override the
       access policy itself, so it hands the ticket to Ticket Resolver,
       who in turn brings in a human. */
    { type: "act", icon: "i-assigned-agent",
      body: avatar("sh", "sm") + " <strong>Software Handler</strong> escalated it to " + avatar("ai", "sm") + " <strong>Ticket Resolver</strong>" },

    /* Ticket Resolver doesn't redo the diagnosis — it reviews what Software
       Handler already found and turns it into the summary Maya sees next. */
    { type: "trace", variant: "reasoning", label: "Thought for 4 seconds", icon: "i-thinking",
      notes: [
        "Software Handler already traced this to Hannah&rsquo;s Workday status and the Extended Leave Access Policy &mdash; I don&rsquo;t need to redo that diagnosis, just confirm it still holds.",
        "The fix itself is simple: flip her status to Active, then restore the NetSuite licence. But the policy reserves that override for a human agent, so I can&rsquo;t approve my own way around it either.",
        "I&rsquo;ll write this up as a summary with the recommended action for a human agent to approve."
      ] },

    { type: "act", icon: "i-assigned-agent",
      body: "<strong>Ticket Resolver</strong> assigned it to " + avatar("maya", "sm") + " <strong>Maya Chen</strong>" },

    { type: "card" }
  ];

  /* The private thread. Maya's turns are the scripted ones; the AI's
     turns arrive on their own after a short "thinking" pause. */
  var THREAD_SCRIPT = [
    {
      maya: {
        time: "9:27 AM",
        text: "Can you give her access to Netsuite without changing anything in Workday?",
        body: "<p>Can you give her access to Netsuite without changing anything in Workday?</p>"
      },
      aiDelay: 1400,
      ai: {
        time: "9:28 AM",
        body: "<p>No, unfortunately. I cannot override the " +
              '<span class="tv-link-plain" data-policy role="link" tabindex="0">Extended Leave Access Policy</span>. So the options are:</p>' +
              "<ol><li>You enable Netsuite access manually</li>" +
              "<li>Or allow me to update workday properties and then enable Netsuite access to Hannah.</li></ol>" +
              "<p>Please let me know what you prefer.</p>"
      }
    },
    {
      maya: {
        time: "9:29 AM",
        text: "Ok go ahead and update workday and give her access to Netsuite.",
        body: "<p>Ok go ahead and update workday and give her access to Netsuite.</p>"
      },
      aiDelay: 900,
      ai: { time: "9:30 AM", body: "<p>On it!</p>" },
      thenTail: true
    }
  ];

  /* What the AI does once it has the human's decision (frames 5 and 6). */
  function tail(openingRow) {
    return [
      { delay: 700, item: openingRow },

      /* The two "made updates in Workday / Netsuite" rows are now live task
         rows, so you watch the work happen instead of reading that it did.
         The app logos moved into the rows with them. */
      { delay: 800, item: { type: "tasks",
        header: "<strong>Ticket Resolver</strong> is applying 3 changes across " +
                mark("workday") + " <strong>Workday</strong> and " +
                mark("netsuite") + " <strong>Netsuite</strong>",
        tasks: [
        { name: "Update Workday worker status",
          meta: mark("workday") + " On Extended Leave &rarr; Active",
          running: "Writing to Workday", runFor: 1600 },
        { name: "Reinstate NetSuite licence",
          meta: mark("netsuite") + " Finance &mdash; Accounts Payable role",
          running: "Provisioning", runFor: 1800 },
        { name: "Verify sign-in",
          meta: "SSO assertion &middot; SAML",
          running: "Checking", runFor: 1200 }
      ] } },

      { delay: 500, loader: "Writing to Hannah", thinkFor: 1200,
        item: { type: "msg", who: "ai", time: "9:32 AM", stream: true,
          body: "<p>Hi Hannah, I&rsquo;ve restored your NetSuite account access. Could you try logging " +
                "in again and check if everything is working?</p>" } },

      { delay: 700, status: ["Waiting on Requester", "warning"], item: { type: "act", icon: "i-status",
        body: "<strong>Ticket Resolver</strong> changed status to <strong>Waiting on Requester</strong>" } },

      { delay: 2600, item: { type: "msg", who: "hannah", time: "9:34 AM",
        body: "<p>Yes, I have access now. Thanks!</p>" } },

      { delay: 700, loader: "Confirming", thinkFor: 1100,
        item: { type: "msg", who: "ai", time: RESOLVED_AT, stream: true,
          body: "<p>Great! Your NetSuite access has been restored and the issue is resolved.</p>" } },

      { delay: 700, status: [resolvedLabel(), "success"], item: { type: "act", icon: "i-status",
        body: "<strong>Ticket Resolver</strong> changed status to <strong>Resolved</strong>" } },

      /* The Ticket Resolver writes up how the ticket was resolved. */
      { delay: 800, loader: "Writing resolution note", thinkFor: 1400,
        item: { type: "note" } },

      /* The Ticket Resolver hands off to the Knowledge Curator for a policy check. */
      { delay: 700, item: { type: "act", icon: "i-assigned-agent",
        body: "<strong>Ticket Resolver</strong> asked " + avatar("kw", "sm") +
              " <strong>Knowledge Curator</strong> to check for policy updates" } },

      /* The Knowledge Curator spotted the same gap the thread exposed. */
      { delay: 1800, item: { type: "trace", variant: "steps", label: "<strong>Knowledge Curator</strong> proposed an update to",
        icon: "i-knowledge-update",
        link: { label: "Extended Leave Access Policy", open: function () { openPolicy(); } },
        steps: [
          ["Extended Leave Access Policy", "1 addition"],
          ["Added: who can approve an early reinstatement", ""],
          ["Cited this ticket as the precedent", "INC-1041"],
          ["Sent to People Ops for review", "awaiting approval"]
        ] } }
    ];
  }

  /* "Resolved in N minutes": from Hannah's first message to the Ticket Resolver's
     closing message, read straight off the scripted timestamps. */
  function toMinutes(t) {
    var m = /(\d+):(\d+)\s*(AM|PM)/i.exec(t);
    var h = parseInt(m[1], 10) % 12 + (/pm/i.test(m[3]) ? 12 : 0);
    return h * 60 + parseInt(m[2], 10);
  }

  function resolvedLabel() {
    var mins = toMinutes(RESOLVED_AT) - toMinutes(OPENED_AT);
    return "Resolved in " + mins + (mins === 1 ? " minute" : " minutes");
  }

  var ROW_DELEGATED = { type: "act", icon: "i-hand-wave",
    body: "<strong>Maya Chen</strong> delegated ticket to " + avatar("ai", "sm") + " <strong>Ticket Resolver</strong>" };

  var ROW_APPROVED = { type: "act", icon: "i-like",
    body: "<strong>Maya Chen</strong> approved the proposed action for " + avatar("ai", "sm") + " <strong>Ticket Resolver</strong>" };

  /* ------------------------------------------------------------------
     State
     --------------------------------------------------------------- */

  var els = {};
  var timers = [];
  var intervals = [];    // the loading states' elapsed counters
  var scriptIndex = 0;   // which THREAD_SCRIPT turn is next
  var threadCount = 0;   // drives the "N comments" chip
  var threadParticipants = [];  // who's spoken in the thread, drives its avatar stack
  var isTyping = false;

  function addParticipant(who) {
    if (threadParticipants.indexOf(who) === -1) threadParticipants.push(who);
  }
  var tailStarted = false;

  function later(fn, ms) {
    var t = setTimeout(fn, ms);
    timers.push(t);
    return t;
  }

  function clearTimers() {
    timers.forEach(clearTimeout);
    intervals.forEach(clearInterval);
    timers = [];
    intervals = [];
  }

  /* ------------------------------------------------------------------
     Appending + scrolling
     --------------------------------------------------------------- */

  function build(item) {
    if (item.type === "msg")   return renderMessage(item);
    if (item.type === "act")   return renderActivity(item);
    if (item.type === "card")  return renderCard("conv");
    if (item.type === "trace") return renderTrace(item);
    if (item.type === "tasks") return renderTasks(item);
    if (item.type === "note")  return renderNote();
    return null;
  }

  function appendConv(item, animate) {
    var n = build(item);
    if (!n) return null;
    if (animate) n.classList.add("tv-enter");
    els.convList.appendChild(n);

    // Messages flagged `stream` arrive word by word rather than all at once.
    if (item.type === "msg" && item.stream && animate) {
      streamInto(n.querySelector(".tv-msg-body"), item.body, scrollConv);
    }

    scrollConv();
    return n;
  }

  function appendThread(n, animate) {
    if (animate) n.classList.add("tv-enter");
    els.threadList.appendChild(n);
    scrollThread();
    return n;
  }

  function scrollConv() {
    var s = els.convScroll;
    s.scrollTo({ top: s.scrollHeight, behavior: "smooth" });
  }

  function scrollThread() {
    var s = els.threadScroll;
    s.scrollTo({ top: s.scrollHeight, behavior: "smooth" });
  }

  /* ------------------------------------------------------------------
     Header status badge + card footer
     --------------------------------------------------------------- */

  function setStatus(label, tone) {
    var tag = els.statusTag;
    if (tag.textContent === label) return;
    tag.classList.remove("tv-swap");
    void tag.offsetWidth;                       // forces the animation to replay
    tag.className = "tv-tag tv-tag-" + tone + " tv-swap";
    tag.textContent = label;
    markListResolved(label.indexOf("Resolved") === 0);
  }

  /* Once resolved, the ticket's card in the list says so at a glance — green
     check instead of the "new" dot, a Resolved tag, muted text — and it drops
     out of the open count in the top bar. Reset puts everything back. */
  var OPEN_COUNT = null;

  function markListResolved(on) {
    var row = $("tvRowActive");
    var pill = $("ticketCountPill");
    if (!row) return;
    if (OPEN_COUNT === null && pill) OPEN_COUNT = parseInt(pill.textContent, 10) || 0;
    if (row.classList.contains("is-resolved") === on) return;
    row.classList.toggle("is-resolved", on);
    if (on) {
      row.classList.remove("tv-swap");
      void row.offsetWidth;
      row.classList.add("tv-swap");
    }
    if (pill && OPEN_COUNT !== null) pill.textContent = String(on ? OPEN_COUNT - 1 : OPEN_COUNT);
  }

  function setCardFoot(html) {
    var foot = $("tvCardFoot");
    if (!foot) return;
    foot.innerHTML = html;
    foot.firstElementChild && foot.firstElementChild.classList.add("tv-swap");
    wireCardFoot();
  }

  function wireCardFoot() {
    var chip = $("tvChip");
    if (chip) chip.addEventListener("click", function () { openThread(); });
    wireAsk();
  }

  /* The lean comment field in the card footer. */
  function wireAsk() {
    var box = $("tvAsk");
    var input = $("tvAskInput");
    var send = $("tvAskSend");
    if (!box || !input || !send) return;

    function sync() {
      send.disabled = !input.value.trim();
    }

    input.addEventListener("input", sync);

    // Same demo trick as the thread composer: click into the empty field
    // and the scripted question types itself.
    box.addEventListener("click", function (e) {
      if (e.target === send) return;
      input.focus();
      var line = pendingLine();
      if (!line || input.value || isTyping) return;
      isTyping = true;
      var i = 0;
      (function step() {
        if (i > line.text.length) { isTyping = false; return; }
        input.value = line.text.slice(0, i);
        sync();
        i += 1;
        later(step, 18 + Math.random() * 22);
      })();
    });

    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (!send.disabled) onDiscuss();
      }
    });

    send.addEventListener("click", onDiscuss);
  }

  /* ------------------------------------------------------------------
     Thread panel
     --------------------------------------------------------------- */

  function openThread() {
    if (els.root.classList.contains("is-thread-open")) return;
    els.root.classList.add("is-thread-open");

    if (!els.threadList.childElementCount) {
      els.threadList.appendChild(renderCard("thread"));
    }

    // The conversation pane narrows from 996px to 636px, which makes its
    // content taller — so re-pin it to the bottom once the slide finishes.
    later(function () {
      scrollConv();
      scrollThread();
      els.threadInput.focus();
    }, 380);
  }

  function closeThread() {
    els.root.classList.remove("is-thread-open");
  }

  /* Discuss: open the sidebar and post what was typed as the first turn. */
  function onDiscuss() {
    var input = $("tvAskInput");
    var text = input ? input.value.trim() : "";
    if (!text || isTyping) return;

    openThread();
    els.threadInput.value = text;
    sendThreadMessage();
  }

  /* "Approve & restore access" isn't wired to a frame in the Figma file.
     Rather than leave it dead, it fast-forwards past the human-decision
     branch straight into the fix — the happy path. */
  function onApprove() {
    if (tailStarted) return;

    // If Maya typed something and then approved anyway, keep it as a note
    // on the approval rather than silently dropping it.
    var note = ($("tvAskInput") || {}).value;
    note = note ? note.trim() : "";

    setCardFoot('<span class="tv-chip tv-chip-approved" aria-live="polite">' + icon("i-approved") + "Approved by Maya Chen</span>");
    setStatus("In-progress", "info");

    runTail(note
      ? { type: "act", icon: ROW_APPROVED.icon,
          body: ROW_APPROVED.body + " with a note: &ldquo;" + escapeHtml(note) + "&rdquo;" }
      : ROW_APPROVED);
  }

  /* ------------------------------------------------------------------
     Scripted typing in the thread composer
     --------------------------------------------------------------- */

  function pendingLine() {
    return scriptIndex < THREAD_SCRIPT.length ? THREAD_SCRIPT[scriptIndex].maya : null;
  }

  function autoType(onDone) {
    var line = pendingLine();
    if (!line || isTyping || els.threadInput.value) { onDone && onDone(); return; }

    isTyping = true;
    els.threadSend.disabled = true;
    var i = 0;

    (function step() {
      if (i > line.text.length) {
        isTyping = false;
        els.threadSend.disabled = false;
        onDone && onDone();
        return;
      }
      els.threadInput.value = line.text.slice(0, i);
      i += 1;
      later(step, 18 + Math.random() * 22);
    })();
  }

  function sendThreadMessage() {
    if (isTyping) return;

    var text = els.threadInput.value.trim();
    var turn = THREAD_SCRIPT[scriptIndex];

    // Empty box: type the scripted line first, then send it.
    if (!text) {
      if (!turn) return;
      autoType(function () { later(sendThreadMessage, 420); });
      return;
    }

    els.threadInput.value = "";

    // Free-typed text still posts, it just doesn't advance the script.
    var scripted = turn && text === turn.maya.text;
    appendThread(renderMessage({
      who: "maya",
      time: scripted ? turn.maya.time : "now",
      body: scripted ? turn.maya.body : "<p>" + escapeHtml(text) + "</p>"
    }), true);

    threadCount += 1;
    addParticipant("maya");
    setCardFoot(cardFootChip(threadCount, threadParticipants));
    setStatus("In-progress", "info");

    if (!scripted) return;
    scriptIndex += 1;

    // The AI shows what it's doing, then streams its answer in.
    var bubble;
    later(function () {
      bubble = appendThread(renderThinkingBubble(turn.ai.loader || "Thinking"), true);
    }, 420);

    later(function () {
      if (bubble) bubble.remove();
      var msg = appendThread(renderMessage({ who: "ai", time: turn.ai.time, body: "" }), true);
      streamInto(msg.querySelector(".tv-msg-body"), turn.ai.body, scrollThread, function () {
        if (turn.thenTail) later(function () { runTail(ROW_DELEGATED); }, 700);
      });
      threadCount += 1;
      addParticipant("ai");
      setCardFoot(cardFootChip(threadCount, threadParticipants));
    }, 420 + turn.aiDelay);
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ------------------------------------------------------------------
     The AI executing the fix, then closing the loop with Hannah
     --------------------------------------------------------------- */

  function runTail(openingRow) {
    if (tailStarted) return;
    tailStarted = true;
    decisionPath = openingRow === ROW_DELEGATED ? "discuss" : "approve";

    // The decision is made — whether by clicking Approve directly, or by
    // Maya telling the AI to go ahead in the thread — so the button comes
    // down now, not the moment a discussion merely starts.
    disableApprove();

    var steps = tail(openingRow);
    var clock = 0;

    steps.forEach(function (step) {
      clock += step.delay;

      if (step.loader) {
        var think = step.thinkFor || 900;

        // Show the loading state, then replace it with the message.
        (function (at, s, ms) {
          later(function () {
            var bubble = renderThinkingBubble(s.loader);
            bubble.classList.add("tv-enter");
            els.convList.appendChild(bubble);
            scrollConv();

            later(function () {
              bubble.remove();
              if (s.status) setStatus(s.status[0], s.status[1]);
              appendConv(s.item, true);
            }, ms);
          }, at);
        })(clock, step, think);

        clock += think;
      } else {
        (function (at, s) {
          later(function () {
            if (s.status) setStatus(s.status[0], s.status[1]);
            appendConv(s.item, true);
          }, at);
        })(clock, step);
      }

      // Hold the queue while a block plays out, so the next row doesn't
      // land on top of a task list still running or a message still
      // streaming in.
      clock += playoutMs(step.item);
    });
  }

  /* Roughly how long an item takes to finish animating itself. */
  function playoutMs(item) {
    if (!item) return 0;

    if (item.type === "tasks") {
      return 260 + item.tasks.reduce(function (sum, t) {
        return sum + (t.runFor || 1100) + 220;
      }, 0);
    }

    if (item.type === "msg" && item.stream) {
      var words = item.body.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
      return words * 48;
    }

    return 0;
  }

  /* ------------------------------------------------------------------
     Boot / reset
     --------------------------------------------------------------- */

  function reset() {
    clearTimers();
    closePolicy();
    scriptIndex = 0;
    threadCount = 0;
    threadParticipants = [];
    isTyping = false;
    tailStarted = false;

    els.root.classList.remove("is-thread-open");
    els.convList.innerHTML = "";
    els.threadList.innerHTML = "";
    els.threadHead.classList.remove("is-scrolled");
    els.threadInput.value = "";
    els.threadSend.disabled = false;
    els.reply.value = "";

    setStatus("In-progress", "info");
    markListResolved(false);
    els.statusTag.classList.remove("tv-swap");

    HISTORY.forEach(function (item) { appendConv(item, false); });
    setCardFoot(cardFootActions());

    // Start pinned to the bottom, like the "Full conversation" frame.
    requestAnimationFrame(function () {
      els.convScroll.scrollTop = els.convScroll.scrollHeight;
    });
  }

  function init() {
    els.root = $("tvRoot");
    if (!els.root) return;

    els.convScroll = $("tvConvScroll");
    els.convList = $("tvConvList");
    els.threadScroll = $("tvThreadScroll");
    els.threadList = $("tvThreadList");
    els.threadHead = $("tvThreadHead");
    els.threadInput = $("tvThreadInput");
    els.threadSend = $("tvThreadSend");
    els.threadComposer = $("tvThreadComposer");
    els.statusTag = $("tvStatusTag");
    els.reply = $("tvReply");

    reset();

    /* The thread header's drop shadow only appears once the thread's own
       content has scrolled up underneath it — not permanently. */
    els.threadScroll.addEventListener("scroll", function () {
      els.threadHead.classList.toggle("is-scrolled", els.threadScroll.scrollTop > 0);
    });

    /* Every "Extended Leave Access Policy" mention opens the policy page —
       except inside the resolution note while it's being edited. */
    function policyTarget(e) {
      var t = e.target.closest && e.target.closest("[data-policy]");
      if (!t || t.closest("[contenteditable='true']")) return null;
      return t;
    }
    document.addEventListener("click", function (e) {
      if (policyTarget(e)) { e.preventDefault(); openPolicy(); }
    });
    document.addEventListener("keydown", function (e) {
      if ((e.key === "Enter" || e.key === " ") && policyTarget(e)) { e.preventDefault(); openPolicy(); }
    });

    /* Thread composer — click anywhere in it and the next scripted line
       types itself. Typing by hand overrides that. */
    els.threadComposer.addEventListener("click", function (e) {
      if (e.target.closest("#tvThreadSend")) return;
      els.threadInput.focus();
      if (!els.threadInput.value && pendingLine()) autoType();
    });

    els.threadInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendThreadMessage();
      }
    });

    els.threadSend.addEventListener("click", sendThreadMessage);
    $("tvThreadClose").addEventListener("click", closeThread);

    /* The main composer posts as the agent. Not part of the scripted
       flow, but a dead Send button in a demo is worse. */
    $("tvReplySend").addEventListener("click", function () {
      var text = els.reply.value.trim();
      if (!text) return;
      els.reply.value = "";
      appendConv({ type: "msg", who: "maya", time: "now", body: "<p>" + escapeHtml(text) + "</p>" }, true);
    });

    $("tvRestart").addEventListener("click", reset);

    document.addEventListener("keydown", function (e) {
      if ((e.key === "r" || e.key === "R") &&
          !/^(INPUT|TEXTAREA)$/.test(e.target.tagName) &&
          !e.target.isContentEditable) reset();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
