/* Ibrahim & Nadirah — jemputan walimatulurus digital
   Vanilla JS: countdown, schedule render, RSVP form, scroll reveal. */

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

// Google Form the RSVP writes to (responses, including wishes, land in its sheet).
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

  var guestName = document.getElementById("f-name").value.trim();
  var guestWish = document.getElementById("f-wish").value.trim();

  function done() {
    // Show the guest's own wish back to them in the thank-you card.
    if (guestWish) {
      document.getElementById("thanks-wish-text").textContent = guestWish;   // textContent — no HTML
      document.getElementById("thanks-wish-name").textContent = guestName;
      document.getElementById("thanks-wish").classList.remove("hidden");
    }
    document.getElementById("rsvp-form").classList.add("hidden");
    document.getElementById("rsvp-thanks").classList.remove("hidden");
  }

  // Google Forms doesn't send CORS headers — fire it off no-cors (the response
  // is opaque, but the submission is recorded) and thank the guest either way.
  fetch(RSVP_ACTION, { method: "POST", mode: "no-cors", body: body })
    .then(done, done);
});

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
