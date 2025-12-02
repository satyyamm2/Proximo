/* -------------------------------
      PROXIMO — FINAL CLEAN JS
  -------------------------------- */

const API = "https://prox-fz98.onrender.com/"; // CHANGE THIS AFTER DEPLOY

// ---------- 1) State ----------
let currentUser = null;
let events = [];
let editingEventId = null;
let selectedType = "All";
const EVENT_TYPES = ["Hackathon", "Seminar", "Webinar", "Workshop"];

// ---------- 2) Helpers ----------
const el = (id) => document.getElementById(id);
const show = (el, bool = true) => el?.classList.toggle("hidden", !bool);
const flex = (el, bool = true) => {
  if (!el) return;
  el.classList.toggle("hidden", !bool);
  if (bool) el.classList.add("flex");
};

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[m]));
}

// ---------- 3) Element refs ----------
const sectionAuth = el("sectionAuth");
const sectionStudent = el("sectionStudent");
const sectionOrganizer = el("sectionOrganizer");
const sectionHelp = el("sectionHelp");

const eventsGrid = el("eventsGrid");
const eventsCount = el("eventsCount");
const filterBtn = el("filterBtn");
const filterMenu = el("filterMenu");
const filterTypeName = el("filterTypeName");
const filterLabel = el("filterLabel");
const noEventsBox = el("noEventsBox");

const openAuthBtn = el("openAuthBtn");
const userMenuContainer = el("userMenuContainer");
const userRoleLabel = el("userRoleLabel");
const userNameLabel = el("userNameLabel");
const signOutBtn = el("signOutBtn");

const navButtons = [...document.querySelectorAll(".nav-btn")];

const modalOverlay = el("modalOverlay");
const modalTitle = el("modalTitle");
const modalBody = el("modalBody");
const modalClose = el("modalClose");
const modalOkay = el("modalOkay");
const modalConfirm = el("modalConfirm");

const chatContainer = el("chatContainer");
const chatInput = el("chatInput");
const chatSendBtn = el("chatSendBtn");

// ---------- 4) Navigation ----------
function setPage(page) {
  show(sectionAuth, page === "auth");
  show(sectionStudent, page === "student");
  show(sectionOrganizer, page === "organizer");
  show(sectionHelp, page === "help");

  navButtons.forEach((b) =>
    b.classList.toggle("active", b.dataset.nav === page)
  );
}

// ---------- 5) Modal ----------
function openModal({ title, html, confirm = null, confirmText = "Confirm" }) {
  modalTitle.textContent = title;
  modalBody.innerHTML = html;

  show(modalConfirm, !!confirm);
  modalConfirm.textContent = confirmText;

  modalConfirm.onclick = () => {
    if (confirm) confirm();
    closeModal();
  };

  flex(modalOverlay, true);
}
function closeModal() {
  flex(modalOverlay, false);
}
modalClose.onclick = closeModal;
modalOkay.onclick = closeModal;

// ---------- 6) Auth — Sign In / Sign Up ----------
let isSignIn = true;
let isStudent = true;

const authForm = el("authForm");
const btnSignIn = el("btnSignIn");
const btnSignUp = el("btnSignUp");
const btnStudent = el("btnStudent");
const btnOrganizer = el("btnOrganizer");
const authHeader = el("authHeader");
const authSubheader = el("authSubheader");
const phoneReq = el("phoneReq");

const studentOnly = [...document.querySelectorAll(".student-only")];
const organizerOnly = [...document.querySelectorAll(".organizer-only")];

function updateAuthMode() {
  btnSignIn.classList.toggle("active", isSignIn);
  btnSignUp.classList.toggle("active", !isSignIn);
  btnStudent.classList.toggle("active", isStudent);
  btnOrganizer.classList.toggle("active", !isStudent);

  authHeader.textContent = isSignIn ? "Welcome Back" : "Create Account";
  authSubheader.textContent = `${isSignIn ? "Sign In" : "Sign Up"} as ${
    isStudent ? "Student" : "Organizer"
  }`;

  studentOnly.forEach((el) =>
    el.classList.toggle("hidden", !( !isSignIn && isStudent ))
  );

  organizerOnly.forEach((el) =>
    el.classList.toggle("hidden", !( !isSignIn && !isStudent ))
  );

  phoneReq.classList.toggle("hidden", isSignIn);
}

btnSignIn.onclick = () => { isSignIn = true; updateAuthMode(); };
btnSignUp.onclick = () => { isSignIn = false; updateAuthMode(); };
btnStudent.onclick = () => { isStudent = true; updateAuthMode(); };
btnOrganizer.onclick = () => { isStudent = false; updateAuthMode(); };

updateAuthMode();

// ---------- 7) AUTH FORM SUBMIT ----------
authForm.onsubmit = async (e) => {
  e.preventDefault();

  const email = el("email").value.trim();
  const password = el("password").value.trim();

  const type = isStudent ? "student" : "organizer";

  if (isSignIn) {
    // ------------------ LOGIN API ------------------
    const res = await fetch(API + "/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, type }),
    }).then((r) => r.json());

    if (!res.success) {
      openModal({ title: "Error", html: `<p>${res.error}</p>` });
      return;
    }

    currentUser = res.data;
  } else {
    // ------------------ SIGN UP API ------------------
    const user = {
      email,
      password,
      type,
      phone: el("phone").value.trim(),
    };

    if (isStudent) {
      user.name = el("name").value.trim();
      user.age = el("age").value.trim();
      user.gender = el("gender").value.trim();
      user.college = el("college").value.trim();
    } else {
      user.organization = el("organization").value.trim();
    }

    const res = await fetch(API + "/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user),
    }).then((r) => r.json());

    if (!res.success) {
      openModal({ title: "Error", html: `<p>${res.error}</p>` });
      return;
    }

    currentUser = res.data;
  }

  // ---------- After successful login/signup ----------
  openAuthBtn.classList.add("hidden");
  userMenuContainer.classList.remove("hidden");
  userRoleLabel.textContent = currentUser.type.toUpperCase();
  userNameLabel.textContent = currentUser.name || currentUser.organization || currentUser.email;

  await loadEvents();
  setPage(currentUser.type === "student" ? "student" : "organizer");

  openModal({ title: "Success", html: `<p>Welcome, <b>${userNameLabel.textContent}</b>!</p>` });
};

// ---------- 8) Sign Out ----------
signOutBtn.onclick = () => {
  currentUser = null;
  userMenuContainer.classList.add("hidden");
  openAuthBtn.classList.remove("hidden");
  setPage("auth");
};

// ---------- 9) Event API Calls ----------
async function loadEvents() {
  const res = await fetch(API + "/api/events").then((r) => r.json());
  events = res.data || [];
  renderStudentEvents();
  if (currentUser?.type === "organizer") loadMyEvents();
}

async function loadMyEvents() {
  const res = await fetch(API + "/api/events/organizer/" + currentUser.email)
    .then((r) => r.json());
  const myEvents = res.data || [];
  renderOrganizerEvents(myEvents);
}

// ---------- 10) Render Student Events ----------
function renderStudentEvents() {
  const filtered =
    selectedType === "All"
      ? events
      : events.filter((ev) => ev.type === selectedType);

  eventsCount.textContent = filtered.length;
  eventsGrid.innerHTML = filtered.map(eventCardHTML).join("");
  show(noEventsBox, filtered.length === 0);

  lucide.createIcons();
}

function eventCardHTML(e) {
  const dateStr = e.date ? new Date(e.date).toDateString() : "";
  return `
    <div class="card">
      <div>
        <div class="flex justify-between items-start mb-3">
          <span class="badge">${e.type}</span>
          <h3 class="text-lg font-bold ml-4">${escapeHTML(e.title)}</h3>
        </div>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">${escapeHTML(e.description)}</p>
        <p><b>Location:</b> ${escapeHTML(e.location)}</p>
        <p><b>Date:</b> ${dateStr}</p>
        <p><b>Time:</b> ${escapeHTML(e.timing)}</p>
        <p><b>Organizer:</b> ${escapeHTML(e.organization)}</p>
      </div>
    </div>`;
}

// ---------- 11) Organizer: Create/Edit/Delete Events ----------
const eventForm = el("eventForm");
const ev_title = el("ev_title");
const ev_type = el("ev_type");
const ev_location = el("ev_location");
const ev_date = el("ev_date");
const ev_timing = el("ev_timing");
const ev_org = el("ev_org");
const ev_link = el("ev_link");
const ev_desc = el("ev_desc");
const cancelEditBtn = el("cancelEditBtn");
const myEventsGrid = el("myEventsGrid");
const myCount = el("myCount");

ev_type.innerHTML = EVENT_TYPES.map((t) => `<option>${t}</option>`).join("");

eventForm.onsubmit = async (e) => {
  e.preventDefault();

  const data = {
    title: ev_title.value.trim(),
    type: ev_type.value,
    location: ev_location.value.trim(),
    date: ev_date.value,
    timing: ev_timing.value.trim(),
    organization: ev_org.value.trim(),
    link: ev_link.value.trim(),
    description: ev_desc.value.trim(),
    organizerId: currentUser.email,
  };

  if (editingEventId) {
    // ----------- UPDATE EVENT -----------
    await fetch(API + "/api/events/" + editingEventId, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    openModal({ title: "Updated", html: `<p>Event updated successfully.</p>` });
  } else {
    // ----------- CREATE EVENT -----------
    await fetch(API + "/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    openModal({ title: "Success", html: `<p>Event posted!</p>` });
  }

  editingEventId = null;
  cancelEditBtn.classList.add("hidden");
  clearEventForm();
  await loadEvents();
};

function clearEventForm() {
  ev_title.value = "";
  ev_type.value = EVENT_TYPES[0];
  ev_location.value = "";
  ev_date.value = "";
  ev_timing.value = "";
  ev_org.value = currentUser.organization || "";
  ev_link.value = "";
  ev_desc.value = "";
}

// Render organizer events
function renderOrganizerEvents(list) {
  myCount.textContent = list.length;
  myEventsGrid.innerHTML = list
    .map(
      (e) => `
    <div class="card">
      <h3 class="font-bold text-lg">${escapeHTML(e.title)}</h3>
      <p class="text-sm mt-2">${escapeHTML(e.description)}</p>

      <div class="flex space-x-2 mt-4">
        <button class="btn-secondary flex-1" onclick="editEvent('${e.id}')">Edit</button>
        <button class="btn-primary flex-1 bg-red-600" onclick="deleteEvent('${e.id}')">Delete</button>
      </div>
    </div>`
    )
    .join("");

  lucide.createIcons();
}

window.editEvent = (id) => {
  const e = events.find((ev) => ev.id === id);
  editingEventId = id;

  ev_title.value = e.title;
  ev_type.value = e.type;
  ev_location.value = e.location;
  ev_date.value = e.date;
  ev_timing.value = e.timing;
  ev_org.value = e.organization;
  ev_link.value = e.link;
  ev_desc.value = e.description;

  cancelEditBtn.classList.remove("hidden");
};

window.deleteEvent = (id) => {
  openModal({
    title: "Confirm Delete",
    html: "<p>This cannot be undone!</p>",
    confirm: async () => {
      await fetch(API + "/api/events/" + id, { method: "DELETE" });
      loadEvents();
    },
  });
};

// ---------- 12) Filter Menu ----------
filterMenu.innerHTML =
  ["All", ...EVENT_TYPES]
    .map(
      (t) =>
        `<button data-filter="${t}" class="block px-3 py-2 hover:bg-indigo-100">${t}</button>`
    )
    .join("");

filterBtn.onclick = () => filterMenu.classList.toggle("hidden");
filterMenu.onclick = (e) => {
  const btn = e.target.closest("button[data-filter]");
  if (!btn) return;
  selectedType = btn.dataset.filter;
  filterTypeName.textContent = selectedType;
  filterLabel.textContent = selectedType;
  filterMenu.classList.add("hidden");
  renderStudentEvents();
};

// ---------- 13) Chatbot ----------
const chatbotResponses = {
  hello: "Hello! How can I help you today?",
  event: "You can browse all events on the Student Dashboard.",
  create: "Organizers can post new events from their dashboard.",
  default: "Sorry, I didn't understand that.",
};

function pushChat(sender, text) {
  const wrap = document.createElement("div");
  wrap.className = `flex ${
    sender === "user" ? "justify-end" : "justify-start"
  }`;
  const bubble = document.createElement("div");
  bubble.className = `chat ${sender}`;
  bubble.textContent = text;
  wrap.appendChild(bubble);
  chatContainer.appendChild(wrap);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

chatSendBtn.onclick = () => {
  const val = chatInput.value.trim();
  if (!val) return;
  pushChat("user", val);

  let key = "default";
  for (const k in chatbotResponses)
    if (val.toLowerCase().includes(k)) key = k;

  setTimeout(() => pushChat("bot", chatbotResponses[key]), 400);
  chatInput.value = "";
};

// ---------- INIT ----------
setPage("auth");
loadEvents();
pushChat("bot", "Hello! I'm your event assistant.");
