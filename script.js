/* Ibrahim & Nadirah — jemputan walimatulurus digital
   Vanilla JS: countdown, schedule render, RSVP form, guest wishes, scroll reveal. */

// Rows without a time follow on from the previous item (s/s).
var SCHEDULE = [
  { time: "7:00", title: "Ketibaan tetamu" },
  { time: "~8:00", title: "Perarakan pengantin" },
  { time: "~8:30", title: "Bacaan doa" },
  { time: "~9:30", title: "Sesi bergambar" },
  { time: "~11:00", title: "Majlis bersurai" }
];

// Wedding date & time — 5 December 2026, 7:00 PM, Malaysia time (UTC+8).
var TARGET = new Date("2026-12-05T19:00:00+08:00").getTime();

// Published Google Sheet CSV of guest wishes
// (Google Sheets → File → Share → Publish to web → the RSVP sheet → CSV).
// Leave "" to keep the wishes section hidden.
var WISHES_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRaBgiPn82Y_laejF0Q01LrDsZL5yS5b2Uz7G5nFfIE0sjFGvBs2Vgrnd5hV5Ex4KVOlO6m_aoXlWBl/pub?output=csv";

// Column headers in the published sheet (case-insensitive match; falls back to
// these positions if a header is renamed).
var WISHES_NAME_HEADER = "your name";
var WISHES_TEXT_HEADER = "a wish for us";
var WISHES_NAME_FALLBACK = 1;
var WISHES_TEXT_FALLBACK = 4;

var WISHES_MAX = 30;

// Google Form the RSVP writes to (the same form that feeds the wishes sheet).
// entry.* IDs come from the form's FB_PUBLIC_LOAD_DATA_.
var RSVP_ACTION = "https://docs.google.com/forms/d/e/1FAIpQLSfXLFhTfwiJSHoRm77XYOW0ZfdyNVU6vOCEfyl9-wC3JK4WoQ/formResponse";
var RSVP_ENTRY = {
  name:   "entry.1406225363",
  attend: "entry.98086365",    // multiple choice: "Yes" / "No"
  guests: "entry.1206663146",
  wish:   "entry.1397502795"
};

var state = { attend: "" };

function pad(n) { return String(n).padStart(2, "0"); }

function renderSchedule() {
  var rows = SCHEDULE;
  var html = "";
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    html += '<div class="sched-row' + (r.time ? '' : ' sched-follow') + '">'
      + '<div class="sched-time">' + (r.time || '<span class="sched-dot"></span>') + '</div>'
      + '<div><div class="sched-name">' + r.title + '</div>'
      + (r.note ? '<div class="sched-note">' + r.note + '</div>' : '')
      + '</div></div>';
  }
  document.getElementById("sched-list").innerHTML = html;
}

function tick() {
  var diff = Math.max(0, TARGET - Date.now());
  var s = Math.floor(diff / 1000);
  document.getElementById("cd-d").textContent = pad(Math.floor(s / 86400));
  document.getElementById("cd-h").textContent = pad(Math.floor(s / 3600) % 24);
  document.getElementById("cd-m").textContent = pad(Math.floor(s / 60) % 60);
  document.getElementById("cd-s").textContent = pad(s % 60);
}

function refreshSubmit() {
  var name = document.getElementById("f-name").value.trim();
  var ready = !!name && !!state.attend;
  document.getElementById("f-submit").disabled = !ready;
}

function pickAttend(val) {
  state.attend = val;
  document.getElementById("f-yes").setAttribute("aria-pressed", String(val === "yes"));
  document.getElementById("f-no").setAttribute("aria-pressed", String(val === "no"));

  // No headcount needed when they aren't coming — lock the guests field.
  var guests = document.getElementById("f-guests");
  var notComing = val === "no";
  guests.disabled = notComing;
  guests.closest(".field").classList.toggle("field-off", notComing);

  refreshSubmit();
}

document.getElementById("f-name").addEventListener("input", refreshSubmit);
document.getElementById("f-yes").addEventListener("click", function () { pickAttend("yes"); });
document.getElementById("f-no").addEventListener("click", function () { pickAttend("no"); });

document.getElementById("rsvp-form").addEventListener("submit", function (e) {
  e.preventDefault();
  var submit = document.getElementById("f-submit");
  if (submit.disabled) return;

  var coming = state.attend === "yes";

  var body = new URLSearchParams();
  body.set(RSVP_ENTRY.name, document.getElementById("f-name").value.trim());
  body.set(RSVP_ENTRY.attend, coming ? "Yes" : "No");
  body.set(RSVP_ENTRY.guests, coming ? document.getElementById("f-guests").value : "");
  body.set(RSVP_ENTRY.wish, document.getElementById("f-wish").value.trim());

  submit.disabled = true;

  function done() {
    document.getElementById("rsvp-form").classList.add("hidden");
    document.getElementById("rsvp-thanks").classList.remove("hidden");
  }

  // Google Forms doesn't send CORS headers — fire it off no-cors (the response
  // is opaque, but the submission is recorded) and thank the guest either way.
  fetch(RSVP_ACTION, { method: "POST", mode: "no-cors", body: body })
    .then(done, done);
});

/* ---- Guest wishes ------------------------------------------------------- */

// RFC 4180-style CSV parser: handles quoted fields containing commas,
// newlines and "" escaped quotes. Returns an array of string arrays.
function parseCSV(text) {
  var rows = [];
  var row = [];
  var field = "";
  var inQuotes = false;

  for (var i = 0; i < text.length; i++) {
    var c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }   // escaped quote
        else { inQuotes = false; }
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') { inQuotes = true; }
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\r") { /* ignore, handle on \n */ }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else { field += c; }
  }
  // Trailing field / row when the file doesn't end with a newline.
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function initWishes() {
  if (!WISHES_CSV) return;

  var section = document.getElementById("wishes");
  var loading = document.getElementById("wishes-loading");
  var list = document.getElementById("wishes-list");

  // Show the section (with its loading state) while we fetch.
  section.classList.remove("hidden");

  // Cache-bust — Google serves published CSVs with a long cache.
  var url = WISHES_CSV + (WISHES_CSV.indexOf("?") === -1 ? "?" : "&") + "t=" + Date.now();

  fetch(url)
    .then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.text();
    })
    .then(function (text) {
      var rows = parseCSV(text);
      if (rows.length < 2) { section.classList.add("hidden"); return; }

      var header = rows.shift().map(function (h) { return String(h).trim().toLowerCase(); });
      var nameIdx = header.indexOf(WISHES_NAME_HEADER);
      var textIdx = header.indexOf(WISHES_TEXT_HEADER);
      if (nameIdx === -1) nameIdx = WISHES_NAME_FALLBACK;
      if (textIdx === -1) textIdx = WISHES_TEXT_FALLBACK;

      var wishes = [];
      for (var i = 0; i < rows.length; i++) {
        var wish = (rows[i][textIdx] || "").trim();
        if (!wish) continue;                          // skip empty / whitespace-only
        wishes.push({ wish: wish, name: (rows[i][nameIdx] || "").trim() });
      }

      if (!wishes.length) { section.classList.add("hidden"); return; }

      // Form responses are appended in submission order, so newest is last.
      wishes.reverse();
      wishes = wishes.slice(0, WISHES_MAX);

      var frag = document.createDocumentFragment();
      wishes.forEach(function (w) {
        var card = document.createElement("div");
        card.className = "wish-card";

        var body = document.createElement("p");
        body.className = "wish-text";
        body.textContent = w.wish;                    // textContent — no HTML from guests
        card.appendChild(body);

        if (w.name) {
          var who = document.createElement("div");
          who.className = "wish-name";
          who.textContent = w.name;
          card.appendChild(who);
        }
        frag.appendChild(card);
      });

      list.textContent = "";
      list.appendChild(frag);
      loading.classList.add("hidden");
    })
    .catch(function () {
      // Decorative section — fail silently.
      section.classList.add("hidden");
    });
}

// Scroll-reveal
var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (reduce) {
  document.querySelectorAll("[data-reveal]").forEach(function (n) { n.classList.add("in"); });
} else {
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
    });
  }, { rootMargin: "0px 0px -12% 0px" });
  document.querySelectorAll("[data-reveal]").forEach(function (n) { io.observe(n); });
}

renderSchedule();
tick();
setInterval(tick, 1000);
initWishes();
