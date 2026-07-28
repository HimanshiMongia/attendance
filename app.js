// AuraAttend Application Logic

const HOUR_SLOTS = [
  { index: 0, label: "09:00 AM - 10:00 AM", start: "09:00", end: "10:00" },
  { index: 1, label: "10:00 AM - 11:00 AM", start: "10:00", end: "11:00" },
  { index: 2, label: "11:00 AM - 12:00 PM", start: "11:00", end: "12:00" },
  { index: 3, label: "12:00 PM - 01:00 PM", start: "12:00", end: "13:00" },
  { index: -1, label: "01:00 PM - 01:30 PM", start: "13:00", end: "13:30", isBreak: true },
  { index: 4, label: "01:30 PM - 02:30 PM", start: "13:30", end: "14:30" },
  { index: 5, label: "02:30 PM - 03:30 PM", start: "14:30", end: "15:30" },
  { index: 6, label: "03:30 PM - 04:30 PM", start: "15:30", end: "16:30" },
  { index: 7, label: "04:30 PM - 05:30 PM", start: "16:30", end: "17:30" }
];

// Readable labels for display
const SLOT_DISPLAY = {
  0: { start: "9 AM",    end: "10 AM" },
  1: { start: "10 AM",   end: "11 AM" },
  2: { start: "11 AM",   end: "12 PM" },
  3: { start: "12 PM",   end: "1 PM"  },
  4: { start: "1:30 PM", end: "2:30 PM" },
  5: { start: "2:30 PM", end: "3:30 PM" },
  6: { start: "3:30 PM", end: "4:30 PM" },
  7: { start: "4:30 PM", end: "5:30 PM" }
};

const DAY_SHORT_CODES = {
  "Monday": "Mon", "Tuesday": "Tue", "Wednesday": "Wed",
  "Thursday": "Thu", "Friday": "Fri", "Saturday": "Sat", "Sunday": "Sun"
};
const DAY_LONG_CODES = {
  "Mon": "Monday", "Tue": "Tuesday", "Wed": "Wednesday",
  "Thu": "Thursday", "Fri": "Friday", "Sat": "Saturday", "Sun": "Sunday"
};

// ===== TIMETABLE =====
// Monday:    SAPM 9-11 (L,T)  |  NAM 11-1 (L,L)  |  DnD 1:30-3:30 (L,T)
// Tuesday:   BEG 1:30-3:30 (L,T)
// Wednesday: DnD 9-11 (L,L)  |  NAM 11-1 (L,T)
// Thursday:  LA 11-1 (L,T)  |  NCLC 1:30-5:30 (P×4)
// Friday:    SAPM 9-11 (L,L)  |  BEG 11-1 (L,L)  |  LA 1:30-3:30 (L,L)

const DEFAULT_STATE = {
  subjects: [
    { id: "sapm", name: "Security Analysis & Portfolio Management", code: "SAPM",     target: 67 },
    { id: "nam",  name: "New Age Marketing",                        code: "NAM",      target: 67 },
    { id: "beg",  name: "Business Ethics & Governance",             code: "BEG",      target: 67 },
    { id: "la",   name: "Legal Aspects",                            code: "LA",       target: 67 },
    { id: "dnd",  name: "Digitalisation & Development",             code: "DnD GE",   target: 67 },
    { id: "nclc", name: "No Code Low Code",                         code: "NCLC SEC", target: 67 }
  ],
  timetable: {
    "Mon": [
      { hourIndex: 0, subjectId: "sapm", type: "Lecture"  },
      { hourIndex: 1, subjectId: "sapm", type: "Tutorial" },
      { hourIndex: 2, subjectId: "nam",  type: "Lecture"  },
      { hourIndex: 3, subjectId: "nam",  type: "Lecture"  },
      { hourIndex: 4, subjectId: "dnd",  type: "Lecture"  },
      { hourIndex: 5, subjectId: "dnd",  type: "Tutorial" }
    ],
    "Tue": [
      { hourIndex: 4, subjectId: "beg", type: "Lecture"  },
      { hourIndex: 5, subjectId: "beg", type: "Tutorial" }
    ],
    "Wed": [
      { hourIndex: 0, subjectId: "dnd", type: "Lecture"  },
      { hourIndex: 1, subjectId: "dnd", type: "Lecture"  },
      { hourIndex: 2, subjectId: "nam", type: "Lecture"  },
      { hourIndex: 3, subjectId: "nam", type: "Tutorial" }
    ],
    "Thu": [
      { hourIndex: 2, subjectId: "la",   type: "Lecture"   },
      { hourIndex: 3, subjectId: "la",   type: "Tutorial"  },
      { hourIndex: 4, subjectId: "nclc", type: "Practical" },
      { hourIndex: 5, subjectId: "nclc", type: "Practical" },
      { hourIndex: 6, subjectId: "nclc", type: "Practical" },
      { hourIndex: 7, subjectId: "nclc", type: "Practical" }
    ],
    "Fri": [
      { hourIndex: 0, subjectId: "sapm", type: "Lecture" },
      { hourIndex: 1, subjectId: "sapm", type: "Lecture" },
      { hourIndex: 2, subjectId: "beg",  type: "Lecture" },
      { hourIndex: 3, subjectId: "beg",  type: "Lecture" },
      { hourIndex: 4, subjectId: "la",   type: "Lecture" },
      { hourIndex: 5, subjectId: "la",   type: "Lecture" }
    ],
    "Sat": [],
    "Sun": []
  },
  attendanceLogs: {}
};

// ================= GLOBAL STATE =================
let state = {};
let selectedDate = new Date();
let calendarCurrentMonth = new Date().getMonth();
let calendarCurrentYear = new Date().getFullYear();
let logFilterSubjectId = "all";

// ================= INIT =================
function init() {
  loadState();
  setupEventListeners();
  renderDateHeader();
  updateCalculations();
  renderTab("dashboard");
  populateLogFilterDropdown();
}

function loadState() {
  const saved = localStorage.getItem("aura_attend_state_v3");
  if (saved) {
    try {
      state = JSON.parse(saved);
      // Migration: update target 75 → 67
      (state.subjects || []).forEach(s => { if (s.target === 75) s.target = 67; });
      // Migration: ensure submitted field
      Object.keys(state.attendanceLogs || {}).forEach(date => {
        Object.keys(state.attendanceLogs[date]).forEach(key => {
          const log = state.attendanceLogs[date][key];
          if (log.status === "LoggedMissed" && log.submitted === undefined) log.submitted = false;
        });
      });
    } catch (e) {
      state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    }
  } else {
    state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    saveState();
  }
}

function saveState() {
  localStorage.setItem("aura_attend_state_v3", JSON.stringify(state));
}

// ================= DATE HELPERS =================
function getLocalDateString(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
function formatDateDisplay(date) {
  return date.toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
}
function renderDateHeader() {
  document.getElementById("headerDate").textContent = formatDateDisplay(new Date());
}

// ================= TAB ROUTING =================
function renderTab(tabId) {
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-tab") === tabId);
  });
  document.querySelectorAll(".tab-content").forEach(tab => {
    const match = "tab" + tabId.charAt(0).toUpperCase() + tabId.slice(1);
    tab.classList.toggle("active", tab.id === match);
  });
  if (tabId === "dashboard")  renderDashboard();
  if (tabId === "subjects")   renderSubjectsAnalytics();
  if (tabId === "logs")       renderLogsTracker();
  if (tabId === "timetable")  renderTimetable();
  if (tabId === "calendar")   renderCalendarView();
}

// ================= TOAST =================
function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  const icons = {
    success: `<svg viewBox="0 0 24 24" width="16" height="16" stroke="var(--color-attended)" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
    error:   `<svg viewBox="0 0 24 24" width="16" height="16" stroke="var(--color-missed)" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`,
    logged:  `<svg viewBox="0 0 24 24" width="16" height="16" stroke="var(--color-logged)" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>`,
    info:    `<svg viewBox="0 0 24 24" width="16" height="16" stroke="var(--accent-glow)" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`
  };
  toast.innerHTML = `<div class="toast-icon">${icons[type]||icons.info}</div><div class="toast-message">${message}</div>`;
  container.appendChild(toast);
  setTimeout(() => toast.classList.add("show"), 50);
  setTimeout(() => { toast.classList.remove("show"); setTimeout(() => toast.remove(), 400); }, 3200);
}

// ================= SLOT GROUPING HELPERS =================

// Two hour-indices are adjacent if they differ by 1 AND don't cross the lunch break (3→4)
function isAdjacentHour(idx1, idx2) {
  if (idx1 === 3 && idx2 === 4) return false; // lunch break between them
  return idx2 === idx1 + 1;
}

// Group consecutive same-subject slots into single display blocks
function groupSlots(rawSlots) {
  const sorted = [...rawSlots].sort((a, b) => a.hourIndex - b.hourIndex);
  const groups = [];
  let current = null;

  sorted.forEach(slot => {
    const def = SLOT_DISPLAY[slot.hourIndex] || {};
    if (current &&
        current.subjectId === slot.subjectId &&
        isAdjacentHour(current.lastHourIndex, slot.hourIndex)) {
      current.slots.push(slot);
      current.lastHourIndex = slot.hourIndex;
      current.endLabel = def.end || "";
    } else {
      current = {
        subjectId: slot.subjectId,
        slots: [slot],
        firstHourIndex: slot.hourIndex,
        lastHourIndex: slot.hourIndex,
        startLabel: def.start || "",
        endLabel: def.end || ""
      };
      groups.push(current);
    }
  });

  return groups;
}

// SVG icons for vote buttons
const VOTE_ICONS = {
  Attended:    `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
  Missed:      `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`,
  LoggedMissed:`<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line></svg>`,
  Cancelled:   `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
  Delete:      `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`
};

function buildVoteBtns(status) {
  return `
    <button class="vote-btn attended ${status==='Attended'?'active':''}" data-status="Attended" title="Attended">${VOTE_ICONS.Attended}</button>
    <button class="vote-btn missed ${status==='Missed'?'active':''}" data-status="Missed" title="Missed">${VOTE_ICONS.Missed}</button>
    <button class="vote-btn logged ${status==='LoggedMissed'?'active':''}" data-status="LoggedMissed" title="Event/Society Log">${VOTE_ICONS.LoggedMissed}</button>
    <button class="vote-btn cancelled ${status==='Cancelled'?'active':''}" data-status="Cancelled" title="Cancelled">${VOTE_ICONS.Cancelled}</button>`;
}

// ================= LOGGING LOGIC =================

function logAttendance(dateStr, key, slot, status) {
  if (!state.attendanceLogs[dateStr]) state.attendanceLogs[dateStr] = {};
  const existing = state.attendanceLogs[dateStr][key];
  if (existing && existing.status === status) {
    delete state.attendanceLogs[dateStr][key];
    if (!Object.keys(state.attendanceLogs[dateStr]).length) delete state.attendanceLogs[dateStr];
    showToast(`Cleared ${slot.subjectName}`, "info");
  } else {
    state.attendanceLogs[dateStr][key] = {
      subjectId: slot.subjectId, subjectName: slot.subjectName,
      type: slot.type, status, timeSlot: slot.timeSlot,
      isExtra: slot.isExtra || false,
      submitted: status === "LoggedMissed" ? false : undefined
    };
    const labels = { Attended:["Attended","success"], Missed:["Missed","error"], LoggedMissed:["Event Log","logged"], Cancelled:["Cancelled","info"] };
    showToast(`${slot.subjectName}: ${labels[status][0]}`, labels[status][1]);
  }
  saveState(); updateCalculations(); renderDashboard();
}

// Mark all slots in a group with the same status (toggle if already all same)
function logGroupAttendance(dateStr, keys, slotsConfig, status) {
  if (!state.attendanceLogs[dateStr]) state.attendanceLogs[dateStr] = {};
  const allSame = keys.every(k => state.attendanceLogs[dateStr]?.[k]?.status === status);
  const subjectName = slotsConfig[0]?.subjectName || "Class";

  keys.forEach((key, i) => {
    const cfg = slotsConfig[i];
    if (allSame) {
      delete state.attendanceLogs[dateStr][key];
    } else {
      state.attendanceLogs[dateStr][key] = {
        subjectId: cfg.subjectId, subjectName: cfg.subjectName,
        type: cfg.type, status, timeSlot: cfg.timeSlot,
        isExtra: false,
        submitted: status === "LoggedMissed" ? false : undefined
      };
    }
  });

  if (!Object.keys(state.attendanceLogs[dateStr] || {}).length) delete state.attendanceLogs[dateStr];

  saveState(); updateCalculations(); renderDashboard();

  const labels = { Attended:["Attended","success"], Missed:["Missed","error"], LoggedMissed:["Event Log","logged"], Cancelled:["Cancelled","info"] };
  const n = keys.length;
  const l = labels[status] || ["Updated","info"];
  showToast(`${subjectName}: ${allSame?"Cleared":""+l[0]} (${n} class${n>1?"es":""})`, l[1]);
}

// ================= CALCULATIONS =================

function calculateSubjectStats(subjectId) {
  let attended = 0, missed = 0, loggedMissed = 0, submitted = 0, cancelled = 0;
  const byType = {
    Lecture:   { attended:0, missed:0, loggedMissed:0, submitted:0, conducted:0 },
    Tutorial:  { attended:0, missed:0, loggedMissed:0, submitted:0, conducted:0 },
    Practical: { attended:0, missed:0, loggedMissed:0, submitted:0, conducted:0 }
  };

  Object.values(state.attendanceLogs).forEach(dayLogs => {
    Object.values(dayLogs).forEach(log => {
      if (log.subjectId !== subjectId) return;
      const t = byType[log.type] || byType.Lecture;
      if      (log.status === "Attended")     { attended++;    t.attended++; }
      else if (log.status === "Missed")       { missed++;      t.missed++;   }
      else if (log.status === "LoggedMissed") {
        loggedMissed++; t.loggedMissed++;
        if (log.submitted) { submitted++; t.submitted++; }
      }
      else if (log.status === "Cancelled")    { cancelled++; }
    });
  });

  const conducted = attended + missed + loggedMissed;
  const actualPct    = conducted > 0 ? (attended / conducted) * 100 : 100;
  const effectivePct = conducted > 0 ? ((attended + submitted) / conducted) * 100 : 100;

  ["Lecture","Tutorial","Practical"].forEach(t => {
    const d = byType[t];
    d.conducted = d.attended + d.missed + d.loggedMissed;
    d.actualPct    = d.conducted > 0 ? (d.attended / d.conducted) * 100 : 100;
    d.effectivePct = d.conducted > 0 ? ((d.attended + d.submitted) / d.conducted) * 100 : 100;
  });

  return { attended, missed, loggedMissed, submitted, conducted, actualPct, effectivePct, cancelled, byType };
}

function updateCalculations() {
  let totalAttended = 0, totalConducted = 0, totalSubmitted = 0, hasLogs = false;
  state.subjects.forEach(subj => {
    const s = calculateSubjectStats(subj.id);
    totalAttended  += s.attended;
    totalConducted += s.conducted;
    totalSubmitted += s.submitted;
    if (s.conducted > 0) hasLogs = true;
  });

  const actualPct    = totalConducted > 0 ? (totalAttended / totalConducted) * 100 : 100;
  const effectivePct = totalConducted > 0 ? ((totalAttended + totalSubmitted) / totalConducted) * 100 : 100;

  const ring = document.getElementById("overallProgressRing");
  const circ = 2 * Math.PI * 70;
  ring.style.strokeDasharray  = circ;
  ring.style.strokeDashoffset = hasLogs ? circ - (actualPct / 100) * circ : circ;
  if (hasLogs) ring.setAttribute("stroke", actualPct >= 67 ? "url(#activeGlowGradient)" : "url(#dangerGradient)");

  document.getElementById("overallPct").textContent          = hasLogs ? `${Math.round(actualPct)}%` : "—";
  document.getElementById("overallRatio").textContent         = `${totalAttended} / ${totalConducted}`;
  document.getElementById("overallEffectivePct").textContent  = hasLogs ? `${Math.round(effectivePct)}%` : "—";
  document.getElementById("overallEffectiveRatio").textContent= `(${totalAttended+totalSubmitted}/${totalConducted} with logs)`;

  const target = 67;
  const si   = document.getElementById("overallStatus");
  const hint = document.getElementById("safetyInsight");

  if (!hasLogs) {
    si.textContent = "No Data"; si.className = "status-indicator danger";
    hint.innerHTML = "Start logging to see goal forecasting."; return;
  }

  if (actualPct >= target) {
    si.textContent = "On Track"; si.className = "status-indicator safe";
    const canMiss = Math.floor((100 * totalAttended - target * totalConducted) / target);
    hint.innerHTML = canMiss > 0
      ? `You can miss the next <strong>${canMiss}</strong> class${canMiss>1?"es":""} and stay above 67%.`
      : `Right on the limit — don't miss any!`;
  } else {
    si.textContent = "Critical"; si.className = "status-indicator danger";
    const need = Math.ceil((target * totalConducted - 100 * totalAttended) / (100 - target));
    hint.innerHTML = effectivePct >= target
      ? `Below target, but submitted logs can help. Attend next <strong>${need}</strong> more.`
      : `Attend next <strong>${need}</strong> class${need>1?"es":""} to recover to 67%.`;
  }

  calculateStreak();
}

function calculateStreak() {
  const todayStr = getLocalDateString(new Date());
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate()-1);
  const yStr = getLocalDateString(yesterday);

  if (!state.attendanceLogs[todayStr] && !state.attendanceLogs[yStr]) {
    document.getElementById("streakCount").textContent = "0";
    document.getElementById("streakMessage").textContent = "Start tracking to build your streak!";
    return;
  }

  let streak = 0, check = new Date();
  if (!state.attendanceLogs[getLocalDateString(check)]) check.setDate(check.getDate()-1);
  while (true) {
    const s = getLocalDateString(check);
    if (state.attendanceLogs[s]) { streak++; check.setDate(check.getDate()-1); }
    else break;
  }

  document.getElementById("streakCount").textContent = streak;
  document.getElementById("streakMessage").textContent =
    streak >= 7 ? "🔥 Weekly streak! Outstanding!" :
    streak >= 3 ? "Nice — building a solid habit!" :
    "Keep going — log daily to grow your streak!";
}

// ================= DASHBOARD RENDERER =================

function renderDashboard() {
  const dayLong  = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });
  const dayShort = DAY_SHORT_CODES[dayLong] || "";
  const dateStr  = getLocalDateString(selectedDate);
  const isToday  = dateStr === getLocalDateString(new Date());

  document.getElementById("checklistDayLabel").textContent = `${dayLong}`;
  document.getElementById("selectedDateText").textContent  = isToday ? "Today"
    : selectedDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });

  const container = document.getElementById("checklistPlaceholder");
  container.innerHTML = "";

  const dayLogs = state.attendanceLogs[dateStr] || {};

  // Build raw slot list with display labels
  const rawSlots = (state.timetable[dayShort] || []).map(s => {
    const def = SLOT_DISPLAY[s.hourIndex] || {};
    return {
      key: `${dayShort}_${s.hourIndex}`,
      hourIndex: s.hourIndex,
      subjectId: s.subjectId,
      type: s.type,
      timeLabel: (HOUR_SLOTS.find(h => h.index === s.hourIndex) || {}).label || "",
      startLabel: def.start || "",
      endLabel: def.end || "",
      isExtra: false
    };
  });

  // Group consecutive same-subject slots
  const groups = groupSlots(rawSlots);

  // Extra classes added via the + button
  const extraEntries = Object.keys(dayLogs)
    .filter(k => dayLogs[k].isExtra)
    .map(k => ({
      key: k,
      isExtra: true,
      subjectId: dayLogs[k].subjectId,
      subjectName: dayLogs[k].subjectName,
      type: dayLogs[k].type,
      timeSlot: dayLogs[k].timeSlot || "",
      status: dayLogs[k].status || null
    }));

  // Build ordered list with lunch break injected
  const allEntries = [];
  let lunchInserted = false;

  groups.forEach(group => {
    if (!lunchInserted && group.firstHourIndex >= 4) {
      allEntries.push({ isBreak: true });
      lunchInserted = true;
    }
    allEntries.push({ isGroup: true, ...group });
  });

  if (!lunchInserted) {
    const pre  = groups.some(g => g.firstHourIndex <= 3);
    const post = groups.some(g => g.firstHourIndex >= 4) || extraEntries.length > 0;
    if (pre && post) { allEntries.push({ isBreak: true }); }
  }

  extraEntries.forEach(e => allEntries.push(e));

  if (allEntries.filter(e => !e.isBreak).length === 0) {
    container.innerHTML = `
      <div class="no-classes-view">
        <div class="no-classes-icon">😴</div>
        <span class="no-classes-title">No Classes Today</span>
        <p class="subtitle">Nothing scheduled for ${dayLong}.<br>Tap <strong>+ Extra</strong> if there's a surprise class!</p>
      </div>`;
    renderCalendarStrip();
    return;
  }

  allEntries.forEach(entry => {
    // ---- Lunch break ----
    if (entry.isBreak) {
      const el = document.createElement("div");
      el.className = "break-divider";
      el.innerHTML = `<span class="break-label">🍽 Lunch Break · 1:00–1:30 PM</span>`;
      container.appendChild(el);
      return;
    }

    // ---- Extra class ----
    if (entry.isExtra) {
      const subj = state.subjects.find(s => s.id === entry.subjectId);
      const name = subj ? subj.name : entry.subjectName || "Unknown";
      const status = dayLogs[entry.key]?.status || null;

      const card = document.createElement("div");
      card.className = "class-card extra-card";
      card.innerHTML = `
        <div class="card-time-block">
          <span class="time-pill">${entry.timeSlot.split(" - ")[0] || "Extra"}</span>
          <span class="badge-extra">EXTRA</span>
        </div>
        <div class="card-body">
          <div class="card-subject-row">
            <span class="card-subject-name">${name}</span>
            <span class="badge-type ${(entry.type||"lecture").toLowerCase()}">${entry.type}</span>
          </div>
          <div class="card-vote-row">
            <div class="vote-buttons">${buildVoteBtns(status)}</div>
            <button class="vote-btn delete-btn" title="Remove">${VOTE_ICONS.Delete}</button>
          </div>
        </div>`;

      const slotConfig = { subjectId: entry.subjectId, subjectName: name, type: entry.type, timeSlot: entry.timeSlot, isExtra: true };
      card.querySelectorAll(".vote-btn:not(.delete-btn)").forEach(btn => {
        btn.addEventListener("click", () => logAttendance(dateStr, entry.key, slotConfig, btn.getAttribute("data-status")));
      });
      card.querySelector(".delete-btn").addEventListener("click", () => deleteExtraClass(dateStr, entry.key));
      container.appendChild(card);
      return;
    }

    // ---- Regular group card ----
    if (entry.isGroup) {
      const subj = state.subjects.find(s => s.id === entry.subjectId);
      const name = subj ? subj.name : "Unknown";
      const code = subj ? subj.code : "";
      const slots = entry.slots;
      const uniqueTypes = [...new Set(slots.map(s => s.type))];
      const allSameType = uniqueTypes.length === 1;

      // Time range: if multiple slots, show start of first to end of last
      const timeRange = slots.length > 1
        ? `${entry.startLabel} – ${entry.endLabel}`
        : entry.startLabel;

      const card = document.createElement("div");
      card.className = "class-card";

      // Build card header
      let cardHTML = `
        <div class="card-time-block">
          <span class="time-pill">${timeRange}</span>
        </div>
        <div class="card-body">
          <div class="card-subject-row">
            <span class="card-subject-name">${name}</span>
            ${code ? `<span class="badge-type">${code}</span>` : ""}
          </div>`;

      if (allSameType) {
        // Same type group: one vote row marks all slots
        const type = uniqueTypes[0];
        const typeLabel = slots.length > 1 ? `${type} × ${slots.length}` : type;
        const keys = slots.map(s => s.key);
        const statuses = keys.map(k => dayLogs[k]?.status || null);
        const consensus = statuses.every(s => s === statuses[0]) ? statuses[0] : null;

        cardHTML += `
          <div class="card-vote-row group-vote-row">
            <span class="badge-type ${type.toLowerCase()} type-label">${typeLabel}</span>
            <div class="vote-buttons">${buildVoteBtns(consensus)}</div>
          </div>`;

        card.innerHTML = cardHTML + `</div>`;

        const slotsConfig = slots.map(s => ({
          subjectId: s.subjectId, subjectName: name,
          type: s.type, timeSlot: s.timeLabel, isExtra: false
        }));
        card.querySelectorAll(".vote-btn").forEach(btn => {
          btn.addEventListener("click", () => logGroupAttendance(dateStr, keys, slotsConfig, btn.getAttribute("data-status")));
        });

      } else {
        // Mixed types: one vote row per slot
        slots.forEach(slot => {
          const status = dayLogs[slot.key]?.status || null;
          cardHTML += `
            <div class="card-vote-row" data-slot-key="${slot.key}">
              <span class="badge-type ${slot.type.toLowerCase()} type-label">${slot.type}</span>
              <div class="vote-buttons">${buildVoteBtns(status)}</div>
            </div>`;
        });

        card.innerHTML = cardHTML + `</div>`;

        card.querySelectorAll(".card-vote-row[data-slot-key]").forEach(row => {
          const key = row.getAttribute("data-slot-key");
          const slot = slots.find(s => s.key === key);
          const slotConfig = { subjectId: slot.subjectId, subjectName: name, type: slot.type, timeSlot: slot.timeLabel, isExtra: false };
          row.querySelectorAll(".vote-btn").forEach(btn => {
            btn.addEventListener("click", () => logAttendance(dateStr, key, slotConfig, btn.getAttribute("data-status")));
          });
        });
      }

      container.appendChild(card);
    }
  });

  renderCalendarStrip();
}

function renderCalendarStrip() {
  const strip = document.getElementById("calendarStrip");
  strip.innerHTML = "";
  for (let i = -3; i <= 3; i++) {
    const d = new Date(selectedDate);
    d.setDate(selectedDate.getDate() + i);
    const ds = getLocalDateString(d);
    const isSelected = ds === getLocalDateString(selectedDate);
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });

    const el = document.createElement("div");
    el.className = `strip-day${isSelected ? " active-day" : ""}`;

    const logs = state.attendanceLogs[ds] || {};
    const statuses = Object.values(logs).map(l => l.status);
    let dotClass = "";
    if (statuses.length) {
      const hasA = statuses.includes("Attended");
      const hasM = statuses.some(s => s === "Missed" || s === "LoggedMissed");
      dotClass = hasA && hasM ? "status-mixed" : hasA ? "status-all-attended" : hasM ? "status-all-missed" : "status-all-cancelled";
    }

    el.innerHTML = `
      <span class="strip-day-name">${dayName}</span>
      <span class="strip-day-num">${d.getDate()}</span>
      ${dotClass ? `<span class="strip-dot-single ${dotClass}"></span>` : `<span class="strip-dot-empty"></span>`}`;
    el.addEventListener("click", () => { selectedDate = new Date(d); renderDashboard(); });
    strip.appendChild(el);
  }
}

// ================= EXTRA CLASS =================
function openExtraClassModal() {
  const select = document.getElementById("extraClassSubject");
  select.innerHTML = state.subjects.map(s => `<option value="${s.id}">${s.name} (${s.code})</option>`).join("");
  document.getElementById("extraClassModal").classList.add("active");
}
function closeExtraClassModal() {
  document.getElementById("extraClassModal").classList.remove("active");
  document.getElementById("extraClassForm").reset();
}
function handleExtraClassSubmit(e) {
  e.preventDefault();
  const subjectId = document.getElementById("extraClassSubject").value;
  const type      = document.getElementById("extraClassType").value;
  const timeSlot  = document.getElementById("extraClassTime").value;
  const dateStr   = getLocalDateString(selectedDate);
  const subj      = state.subjects.find(s => s.id === subjectId);
  if (!state.attendanceLogs[dateStr]) state.attendanceLogs[dateStr] = {};
  const key = `Extra_${Date.now()}`;
  state.attendanceLogs[dateStr][key] = {
    subjectId, subjectName: subj ? subj.name : "Unknown",
    type, status: null, timeSlot, isExtra: true
  };
  saveState(); updateCalculations();
  closeExtraClassModal();
  showToast(`Extra ${type} added`, "success");
  renderDashboard();
}
function deleteExtraClass(dateStr, key) {
  if (state.attendanceLogs[dateStr]?.[key]) {
    const name = state.attendanceLogs[dateStr][key].subjectName;
    delete state.attendanceLogs[dateStr][key];
    if (!Object.keys(state.attendanceLogs[dateStr]).length) delete state.attendanceLogs[dateStr];
    saveState(); updateCalculations(); renderDashboard();
    showToast(`Removed extra class for ${name}`, "info");
  }
}

// ================= SUBJECTS ANALYTICS =================
function renderSubjectsAnalytics() {
  const grid = document.getElementById("subjectsDetailGrid");
  grid.innerHTML = "";

  state.subjects.forEach(subj => {
    const stats = calculateSubjectStats(subj.id);
    const good  = stats.actualPct >= subj.target;

    let advice = "";
    if (stats.conducted === 0) {
      advice = "No classes logged yet.";
    } else if (good) {
      const canMiss = Math.floor((100 * stats.attended - subj.target * stats.conducted) / subj.target);
      advice = canMiss > 0
        ? `Safe — can skip <strong>${canMiss}</strong> more class${canMiss!==1?"es":""}.`
        : `On the limit — don't miss any!`;
    } else {
      const need = Math.ceil((subj.target * stats.conducted - 100 * stats.attended) / (100 - subj.target));
      advice = stats.effectivePct >= subj.target
        ? `Below target, but logs can help. Attend <strong>${need}</strong> more.`
        : `Attend next <strong>${need}</strong> class${need!==1?"es":""} to reach ${subj.target}%.`;
    }

    // Only show types that appear in this subject's timetable
    const typeRows = ["Lecture","Tutorial","Practical"].filter(t =>
      stats.byType[t].conducted > 0 ||
      Object.values(state.timetable).some(day => day.some(sl => sl.subjectId === subj.id && sl.type === t))
    );

    const typeHTML = typeRows.map(t => {
      const d   = stats.byType[t];
      const pct = d.conducted > 0 ? Math.round(d.actualPct) : null;
      const col = pct === null ? "var(--text-muted)" : pct >= subj.target ? "var(--color-attended)" : "var(--color-missed)";
      return `
        <div class="type-row">
          <span class="badge-type ${t.toLowerCase()} type-label">${t}</span>
          <div class="type-bar-wrap">
            <div class="type-bar" style="width:${pct||0}%; background:${col}"></div>
          </div>
          <span class="type-pct" style="color:${col}">${pct !== null ? pct+"%" : "—"}</span>
          <span class="type-fraction">${d.attended}/${d.conducted}</span>
        </div>`;
    }).join("");

    const card = document.createElement("div");
    card.className = "subj-analytics-card";
    card.innerHTML = `
      <div class="subj-card-top">
        <div>
          <span class="subj-card-title">${subj.name}</span>
          ${subj.code ? `<span class="subj-card-code">${subj.code}</span>` : ""}
        </div>
        <div class="pct-group">
          <span class="subj-pct-main" style="color:${good?"var(--color-attended)":"var(--color-missed)"}">${Math.round(stats.actualPct)}%</span>
          <span class="subj-pct-eff">Eff: ${Math.round(stats.effectivePct)}%</span>
        </div>
      </div>
      <div class="subj-progress-container">
        <div class="subj-progress-bar actual" style="width:${stats.actualPct}%; background:${good?"var(--color-attended)":"var(--color-missed)"}"></div>
        <div class="subj-progress-bar effective" style="width:${stats.effectivePct}%"></div>
      </div>
      <div class="subj-meta-row">
        <span>Attended: ${stats.attended}/${stats.conducted}</span>
        <span>Target: ${subj.target}%</span>
      </div>
      <div class="type-breakdown">
        ${typeHTML}
      </div>
      <div class="subj-advice">${advice}</div>`;
    grid.appendChild(card);
  });
}

// ================= LOGS TRACKER =================
function populateLogFilterDropdown() {
  const select = document.getElementById("filterSubject");
  select.innerHTML = `<option value="all">All Subjects</option>`;
  state.subjects.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s.id; opt.textContent = s.name;
    select.appendChild(opt);
  });
}

function renderLogsTracker() {
  const tbody       = document.getElementById("logsTableBody");
  const placeholder = document.getElementById("noLogsPlaceholder");
  tbody.innerHTML   = "";

  const list = [];
  Object.keys(state.attendanceLogs).forEach(dateStr => {
    Object.keys(state.attendanceLogs[dateStr]).forEach(key => {
      const log = state.attendanceLogs[dateStr][key];
      if (log.status === "LoggedMissed") list.push({ dateStr, key, ...log });
    });
  });

  list.sort((a, b) => new Date(b.dateStr) - new Date(a.dateStr));
  const filtered = logFilterSubjectId === "all" ? list : list.filter(l => l.subjectId === logFilterSubjectId);

  if (!filtered.length) { placeholder.style.display = "flex"; return; }
  placeholder.style.display = "none";

  filtered.forEach(log => {
    const tr = document.createElement("tr");
    if (log.submitted) tr.className = "submitted-row";
    const date = new Date(log.dateStr + "T12:00:00").toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    tr.innerHTML = `
      <td style="text-align:center;">
        <div class="custom-chk ${log.submitted?"checked":""}" data-date="${log.dateStr}" data-key="${log.key}">
          <svg viewBox="0 0 24 24" width="11" height="11" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
      </td>
      <td><div style="font-weight:600;font-size:0.85rem;">${date}</div></td>
      <td style="font-weight:600;font-size:0.85rem;" class="strike-text">${log.subjectName}</td>
      <td><span class="badge-type ${(log.type||"lecture").toLowerCase()}">${log.type}</span></td>
      <td><span class="status-badge ${log.submitted?"submitted":"pending"}">${log.submitted?"Done":"Pending"}</span></td>`;
    tr.querySelector(".custom-chk").addEventListener("click", () => {
      if (state.attendanceLogs[log.dateStr]?.[log.key]) {
        state.attendanceLogs[log.dateStr][log.key].submitted = !log.submitted;
        saveState(); updateCalculations(); renderLogsTracker();
        showToast(`Log ${!log.submitted?"submitted":"unsubmitted"}`, !log.submitted?"success":"info");
      }
    });
    tbody.appendChild(tr);
  });
}

// ================= TIMETABLE =================
function renderTimetable() {
  renderSubjectList();
  renderWeeklyGrid();
}

function renderSubjectList() {
  const container = document.getElementById("subjectsContainer");
  container.innerHTML = "";
  state.subjects.forEach(subj => {
    const stats = calculateSubjectStats(subj.id);
    const el = document.createElement("div");
    el.className = "subject-item-card";
    el.innerHTML = `
      <div class="subj-info">
        <span class="subj-name">${subj.name}</span>
        <span class="subj-meta">${subj.code} · Target: ${subj.target}% · Conducted: ${stats.conducted}</span>
      </div>
      <div class="subj-actions">
        <button class="icon-btn" title="Edit" onclick="openSubjectModal('${subj.id}')">
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
        </button>
        <button class="icon-btn" style="color:var(--color-missed)" title="Delete" onclick="deleteSubject('${subj.id}')">
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
      </div>`;
    container.appendChild(el);
  });
}

function renderWeeklyGrid() {
  const tbody = document.getElementById("timetableBody");
  tbody.innerHTML = "";
  HOUR_SLOTS.forEach(timeDef => {
    const tr = document.createElement("tr");
    const tc = document.createElement("td");
    tc.className = "time-col-cell";
    tc.innerHTML = `<div>${timeDef.start}</div><div>${timeDef.end}</div>`;
    tr.appendChild(tc);
    if (timeDef.isBreak) {
      const lc = document.createElement("td");
      lc.className = "lunch-break-cell"; lc.colSpan = 6; lc.textContent = "Lunch Break";
      tr.appendChild(lc);
    } else {
      ["Mon","Tue","Wed","Thu","Fri","Sat"].forEach(day => {
        const td = document.createElement("td");
        const wrap = document.createElement("div"); wrap.className = "slot-cell-container";
        const slot = (state.timetable[day]||[]).find(s => s.hourIndex === timeDef.index);
        if (slot) {
          const subj = state.subjects.find(s => s.id === slot.subjectId);
          const div = document.createElement("div"); div.className = "slot-item";
          div.innerHTML = `<span class="slot-item-name">${subj?subj.name:"?"}</span><span class="slot-item-type">${slot.type}</span>`;
          div.addEventListener("click", () => openSlotModal(day, timeDef.index, slot));
          wrap.appendChild(div);
        } else {
          const btn = document.createElement("button"); btn.className = "slot-add-btn";
          btn.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;
          btn.addEventListener("click", () => openSlotModal(day, timeDef.index, null));
          wrap.appendChild(btn);
        }
        td.appendChild(wrap); tr.appendChild(td);
      });
    }
    tbody.appendChild(tr);
  });
}

// ================= MODALS =================
window.openSubjectModal = function(subjectId = null) {
  document.getElementById("subjectForm").reset();
  document.getElementById("modalSubjectId").value = "";
  if (subjectId) {
    const subj = state.subjects.find(s => s.id === subjectId);
    if (subj) {
      document.getElementById("subjectModalTitle").textContent = "Edit Subject";
      document.getElementById("modalSubjectId").value = subj.id;
      document.getElementById("subjectName").value   = subj.name;
      document.getElementById("subjectCode").value   = subj.code || "";
      document.getElementById("subjectTarget").value = subj.target || 67;
    }
  } else {
    document.getElementById("subjectModalTitle").textContent = "Add Subject";
    document.getElementById("subjectTarget").value = 67;
  }
  document.getElementById("subjectModal").classList.add("active");
};
function closeSubjectModal() { document.getElementById("subjectModal").classList.remove("active"); }
function handleSubjectFormSubmit(e) {
  e.preventDefault();
  const id     = document.getElementById("modalSubjectId").value;
  const name   = document.getElementById("subjectName").value.trim();
  const code   = document.getElementById("subjectCode").value.trim();
  const target = parseInt(document.getElementById("subjectTarget").value) || 67;
  if (id) {
    const idx = state.subjects.findIndex(s => s.id === id);
    if (idx !== -1) { state.subjects[idx] = { ...state.subjects[idx], name, code, target }; showToast(`Updated "${name}"`, "success"); }
  } else {
    state.subjects.push({ id: `s_${Date.now()}`, name, code, target });
    showToast(`Created "${name}"`, "success");
  }
  saveState(); closeSubjectModal(); updateCalculations(); populateLogFilterDropdown(); renderTimetable();
}
window.deleteSubject = function(subjectId) {
  const subj = state.subjects.find(s => s.id === subjectId);
  if (!subj || !confirm(`Delete "${subj.name}"?`)) return;
  state.subjects = state.subjects.filter(s => s.id !== subjectId);
  Object.keys(state.timetable).forEach(d => { state.timetable[d] = state.timetable[d].filter(sl => sl.subjectId !== subjectId); });
  saveState(); updateCalculations(); populateLogFilterDropdown(); renderTimetable();
  showToast(`Deleted "${subj.name}"`, "info");
};

function openSlotModal(day, hourIndex, slot = null) {
  document.getElementById("slotForm").reset();
  document.getElementById("slotDay").value       = day;
  document.getElementById("slotHourIndex").value = hourIndex;
  const timeDef = HOUR_SLOTS.find(h => h.index === hourIndex);
  document.getElementById("slotTimeLabel").textContent = `${DAY_LONG_CODES[day]||day} · ${timeDef ? timeDef.label : ""}`;
  const select = document.getElementById("slotSubject");
  select.innerHTML = state.subjects.map(s => `<option value="${s.id}">${s.name} (${s.code})</option>`).join("");
  const delBtn = document.getElementById("btnDeleteSlot");
  if (slot) {
    document.getElementById("slotModalTitle").textContent = "Edit Slot";
    select.value = slot.subjectId;
    document.getElementById("slotType").value = slot.type;
    delBtn.style.display = "block";
  } else {
    document.getElementById("slotModalTitle").textContent = "Add Slot";
    delBtn.style.display = "none";
  }
  document.getElementById("slotModal").classList.add("active");
}
function closeSlotModal() { document.getElementById("slotModal").classList.remove("active"); }
function handleSlotFormSubmit(e) {
  e.preventDefault();
  const day       = document.getElementById("slotDay").value;
  const hourIndex = parseInt(document.getElementById("slotHourIndex").value);
  const subjectId = document.getElementById("slotSubject").value;
  const type      = document.getElementById("slotType").value;
  if (!subjectId) { showToast("Add a subject first!", "error"); return; }
  if (!state.timetable[day]) state.timetable[day] = [];
  state.timetable[day] = state.timetable[day].filter(s => s.hourIndex !== hourIndex);
  state.timetable[day].push({ hourIndex, subjectId, type });
  saveState(); closeSlotModal(); renderTimetable();
  showToast("Timetable updated", "success");
}
function deleteSlot() {
  const day       = document.getElementById("slotDay").value;
  const hourIndex = parseInt(document.getElementById("slotHourIndex").value);
  if (state.timetable[day]) {
    state.timetable[day] = state.timetable[day].filter(s => s.hourIndex !== hourIndex);
    saveState(); closeSlotModal(); renderTimetable();
    showToast("Slot removed", "info");
  }
}

// ================= CALENDAR VIEW =================
function renderCalendarView() {
  const label = new Date(calendarCurrentYear, calendarCurrentMonth);
  document.getElementById("currentMonthYearText").textContent = label.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const grid = document.getElementById("calendarDaysGrid");
  grid.innerHTML = "";
  const firstDay  = new Date(calendarCurrentYear, calendarCurrentMonth, 1).getDay();
  const totalDays = new Date(calendarCurrentYear, calendarCurrentMonth+1, 0).getDate();
  const prevTotal = new Date(calendarCurrentYear, calendarCurrentMonth, 0).getDate();

  for (let i = firstDay-1; i >= 0; i--) {
    const c = document.createElement("div");
    c.className = "calendar-day-cell inactive-month";
    c.innerHTML = `<span class="day-number">${prevTotal-i}</span>`;
    grid.appendChild(c);
  }
  for (let d = 1; d <= totalDays; d++) {
    const cellDate = new Date(calendarCurrentYear, calendarCurrentMonth, d);
    const ds = getLocalDateString(cellDate);
    const c = document.createElement("div");
    c.className = "calendar-day-cell";
    if (ds === getLocalDateString(new Date())) c.classList.add("today-cell");
    c.innerHTML = `<span class="day-number">${d}</span>`;
    const logs = state.attendanceLogs[ds];
    if (logs && Object.keys(logs).length) {
      const arr = Object.values(logs).filter(l => l.status);
      const hasA = arr.some(l => l.status === "Attended");
      const hasM = arr.some(l => l.status === "Missed" || l.status === "LoggedMissed");
      const hasC = arr.some(l => l.status === "Cancelled");
      const dotCls = hasA && hasM ? "status-mixed" : hasA ? "status-all-attended" : hasM ? "status-all-missed" : hasC ? "status-all-cancelled" : "";
      if (dotCls) { const dot = document.createElement("span"); dot.className = `day-dot ${dotCls}`; c.appendChild(dot); }
    } else {
      const wdName = cellDate.toLocaleDateString('en-US', { weekday: 'long' });
      const ds2 = DAY_SHORT_CODES[wdName];
      if ((state.timetable[ds2]||[]).length > 0) {
        const dot = document.createElement("span"); dot.className = "day-dot status-no-classes"; c.appendChild(dot);
      }
    }
    c.addEventListener("click", () => openDayLogsModal(cellDate));
    grid.appendChild(c);
  }
  const remaining = (7 - ((firstDay+totalDays) % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    const c = document.createElement("div"); c.className = "calendar-day-cell inactive-month";
    c.innerHTML = `<span class="day-number">${i}</span>`; grid.appendChild(c);
  }
}

function openDayLogsModal(date) {
  const ds      = getLocalDateString(date);
  const dayLong = date.toLocaleDateString('en-US', { weekday: 'long' });
  const dayShort = DAY_SHORT_CODES[dayLong] || "";
  document.getElementById("dayLogsTitle").textContent = `${date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  const container = document.getElementById("dayLogsListContainer");
  container.innerHTML = "";
  const storedLogs = state.attendanceLogs[ds] || {};
  const ttSlots = state.timetable[dayShort] || [];
  const items = [];
  ttSlots.forEach(slot => {
    const key = `${dayShort}_${slot.hourIndex}`;
    const log = storedLogs[key];
    const subj = state.subjects.find(s => s.id === slot.subjectId);
    const timeDef = HOUR_SLOTS.find(h => h.index === slot.hourIndex);
    items.push({ key, subjectId: slot.subjectId, subjectName: subj?subj.name:"?",
      type: slot.type, timeSlot: timeDef?timeDef.label:"", hourIndex: slot.hourIndex,
      status: log?log.status:"Unmarked", submitted: log?(log.submitted||false):false, isExtra: false });
  });
  Object.keys(storedLogs).filter(k => storedLogs[k].isExtra).forEach(k => {
    const log = storedLogs[k];
    items.push({ key:k, subjectId:log.subjectId, subjectName:log.subjectName, type:log.type,
      timeSlot:log.timeSlot||"", hourIndex:998, status:log.status||"Unmarked", submitted:log.submitted||false, isExtra:true });
  });
  items.sort((a,b) => a.hourIndex - b.hourIndex);

  if (!items.length) {
    container.innerHTML = `<div style="text-align:center;padding:1.5rem;color:var(--text-secondary);">No classes scheduled.</div>`;
  } else {
    items.forEach(item => {
      const row = document.createElement("div");
      row.className = "day-log-edit-item";
      row.innerHTML = `
        <div class="edit-item-name-group">
          <span class="edit-item-subject">${item.subjectName} ${item.isExtra?'<span class="badge-extra">EXTRA</span>':''}</span>
          <span class="edit-item-meta">${item.type} · ${(item.timeSlot||"").split(" - ")[0]||""}</span>
        </div>
        <div class="radio-options-group">
          <label class="radio-option-label"><input type="radio" name="r_${item.key}" value="Attended" ${item.status==="Attended"?"checked":""}><span>✓</span></label>
          <label class="radio-option-label"><input type="radio" name="r_${item.key}" value="Missed" ${item.status==="Missed"?"checked":""}><span>✗</span></label>
          <label class="radio-option-label"><input type="radio" name="r_${item.key}" value="LoggedMissed" ${item.status==="LoggedMissed"?"checked":""}><span>📋</span></label>
          <label class="radio-option-label"><input type="radio" name="r_${item.key}" value="Cancelled" ${item.status==="Cancelled"?"checked":""}><span>—</span></label>
          <label class="radio-option-label"><input type="radio" name="r_${item.key}" value="Unmarked" ${!item.status||item.status==="Unmarked"?"checked":""}><span>?</span></label>
        </div>`;
      row.querySelectorAll("input[type=radio]").forEach(radio => {
        radio.addEventListener("change", e => {
          const newStatus = e.target.value;
          if (!state.attendanceLogs[ds]) state.attendanceLogs[ds] = {};
          if (newStatus === "Unmarked") {
            delete state.attendanceLogs[ds][item.key];
            if (!Object.keys(state.attendanceLogs[ds]).length) delete state.attendanceLogs[ds];
          } else {
            state.attendanceLogs[ds][item.key] = {
              subjectId: item.subjectId, subjectName: item.subjectName,
              type: item.type, status: newStatus, timeSlot: item.timeSlot,
              isExtra: item.isExtra, submitted: newStatus==="LoggedMissed"?item.submitted:undefined
            };
          }
          saveState(); updateCalculations();
        });
      });
      container.appendChild(row);
    });
  }

  document.getElementById("btnSaveDayLogs").onclick = () => {
    document.getElementById("dayLogsModal").classList.remove("active");
    renderCalendarView(); renderDashboard();
  };
  document.getElementById("dayLogsModal").classList.add("active");
}

// ================= DATA MANAGEMENT =================
function exportDataBackup() {
  const str = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
  const a = document.createElement("a"); a.href = str;
  const d = new Date();
  a.download = `aura_attend_${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  showToast("Backup downloaded!", "success");
}
function handleImport(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = evt => {
    try {
      const imp = JSON.parse(evt.target.result);
      if (Array.isArray(imp.subjects) && typeof imp.timetable === "object") {
        state = imp; saveState(); updateCalculations(); populateLogFilterDropdown(); renderTab("dashboard");
        showToast("Data imported!", "success");
      } else showToast("Invalid backup file!", "error");
    } catch { showToast("Could not read file.", "error"); }
  };
  reader.readAsText(file);
}
function clearAll() {
  if (!confirm("Erase ALL data permanently?")) return;
  state = JSON.parse(JSON.stringify(DEFAULT_STATE));
  saveState(); updateCalculations(); populateLogFilterDropdown(); renderTab("dashboard");
  showToast("Reset complete.", "info");
}

// ================= EVENT LISTENERS =================
function setupEventListeners() {
  document.getElementById("btnTabDashboard").addEventListener("click", () => renderTab("dashboard"));
  document.getElementById("btnTabSubjects") .addEventListener("click", () => renderTab("subjects"));
  document.getElementById("btnTabLogs")     .addEventListener("click", () => renderTab("logs"));
  document.getElementById("btnTabTimetable").addEventListener("click", () => renderTab("timetable"));
  document.getElementById("btnTabCalendar") .addEventListener("click", () => renderTab("calendar"));

  document.getElementById("btnPrevDay").addEventListener("click", () => { selectedDate.setDate(selectedDate.getDate()-1); renderDashboard(); });
  document.getElementById("btnNextDay").addEventListener("click", () => { selectedDate.setDate(selectedDate.getDate()+1); renderDashboard(); });

  document.getElementById("btnOpenExtraClassModal") .addEventListener("click", openExtraClassModal);
  document.getElementById("btnCloseExtraClassModal").addEventListener("click", closeExtraClassModal);
  document.getElementById("btnCancelExtraClassModal").addEventListener("click", closeExtraClassModal);
  document.getElementById("extraClassForm").addEventListener("submit", handleExtraClassSubmit);

  document.getElementById("filterSubject").addEventListener("change", e => { logFilterSubjectId = e.target.value; renderLogsTracker(); });

  document.getElementById("btnAddSubject")       .addEventListener("click", () => window.openSubjectModal());
  document.getElementById("btnCloseSubjectModal") .addEventListener("click", closeSubjectModal);
  document.getElementById("btnCancelSubjectModal").addEventListener("click", closeSubjectModal);
  document.getElementById("subjectForm")          .addEventListener("submit", handleSubjectFormSubmit);

  document.getElementById("btnCloseSlotModal") .addEventListener("click", closeSlotModal);
  document.getElementById("btnCancelSlotModal").addEventListener("click", closeSlotModal);
  document.getElementById("slotForm")          .addEventListener("submit", handleSlotFormSubmit);
  document.getElementById("btnDeleteSlot")     .addEventListener("click", deleteSlot);
  document.getElementById("btnResetTimetable") .addEventListener("click", () => {
    if (confirm("Clear entire timetable?")) {
      state.timetable = { Mon:[],Tue:[],Wed:[],Thu:[],Fri:[],Sat:[],Sun:[] };
      saveState(); renderTimetable(); showToast("Timetable cleared.", "info");
    }
  });

  document.getElementById("btnCloseDayLogsModal").addEventListener("click", () => {
    document.getElementById("dayLogsModal").classList.remove("active");
    renderCalendarView(); renderDashboard();
  });

  document.getElementById("btnPrevMonth").addEventListener("click", () => {
    calendarCurrentMonth--; if (calendarCurrentMonth < 0) { calendarCurrentMonth = 11; calendarCurrentYear--; }
    renderCalendarView();
  });
  document.getElementById("btnNextMonth").addEventListener("click", () => {
    calendarCurrentMonth++; if (calendarCurrentMonth > 11) { calendarCurrentMonth = 0; calendarCurrentYear++; }
    renderCalendarView();
  });

  document.getElementById("btnExportData").addEventListener("click", exportDataBackup);
  document.getElementById("btnClearAllData").addEventListener("click", clearAll);
  const fi = document.getElementById("importFileInput");
  document.getElementById("btnImportData").addEventListener("click", () => fi.click());
  fi.addEventListener("change", handleImport);
}

window.onload = init;
