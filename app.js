const output = document.getElementById("output");
const commandForm = document.getElementById("commandForm");
const commandInput = document.getElementById("commandInput");
const exportBtn = document.getElementById("exportBtn");
const importFile = document.getElementById("importFile");

const dayStatus = document.getElementById("dayStatus");
const metricsList = document.getElementById("metricsList");
const gremiumStatus = document.getElementById("gremiumStatus");
const deadlinesList = document.getElementById("deadlinesList");
const docStatus = document.getElementById("docStatus");

const STORAGE_KEY = "br_simulator_state";
const TOTAL_DAYS = 5;

const reflectionQuestions = [
  "Wie hast du die Rolle empfunden?",
  "Was war überraschend?",
  "Was war belastend?",
  "Kannst du dir vorstellen, diese Rolle im echten Leben zu übernehmen?",
  "Was würde dich davon abhalten?",
  "Was hat dich motiviert?",
];

const stateDefaults = () => ({
  role: null,
  day: 1,
  slot: 1,
  slotsPerDay: 8,
  totalDays: TOTAL_DAYS,
  metrics: {
    trustEmployees: 55,
    trustEmployer: 40,
    teamCohesion: 60,
    legalRisk: 20,
    stress: 30,
    workload: 35,
    reputation: 50,
  },
  factions: [
    { name: "Pragmatisch", mood: "stabil" },
    { name: "Konfrontativ", mood: "wachsam" },
    { name: "Vorsichtig", mood: "zögerlich" },
  ],
  keyMembers: [
    { name: "Ayse", tendency: "vermittelnd", influence: 7 },
    { name: "Jonas", tendency: "konsequent", influence: 6 },
    { name: "Mira", tendency: "risikoavers", influence: 5 },
  ],
  pendingDeadlines: [],
  formalStatus: "korrekt",
  notes: [],
  caseFiles: [],
  meetingMinutesQuality: 65,
  gbrRelationship: 50,
  escalationLevel: "none",
  log: [],
  currentEvent: null,
  currentOptions: [],
  currentMode: "role-select",
  reflectionAnswers: {},
});

let contentStore = {
  events: [],
  cases: [],
  negotiations: [],
  gbr: [],
  conciliation: [],
  knowledge: [],
};

let state = loadState();

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (error) {
      console.error("State load failed", error);
    }
  }
  return stateDefaults();
}

function resetState() {
  state = stateDefaults();
  saveState();
}

function addLine(message, className = "") {
  const line = document.createElement("div");
  line.className = `line ${className}`.trim();
  line.textContent = message;
  output.appendChild(line);
  output.scrollTop = output.scrollHeight;
}

function addBlock(lines, className = "") {
  lines.forEach((line) => addLine(line, className));
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

async function loadContent() {
  const manifest = await fetch("content/manifest.json").then((res) => res.json());
  const categories = Object.keys(manifest);

  for (const category of categories) {
    const files = manifest[category];
    const entries = await Promise.all(
      files.map((file) => fetch(file).then((res) => res.json()))
    );
    contentStore[category] = entries;
  }
}

function init() {
  renderStatus();
  addLine("Willkommen beim BR-Simulator.", "accent");
  if (!state.role) {
    showRolePrompt();
  } else {
    addLine(`Aktuelle Rolle: ${roleLabel(state.role)}.`, "accent");
    addLine("Nutze 'help' für Befehle.");
  }
}

function showRolePrompt() {
  addBlock([
    "Bitte wähle deine Rolle:",
    "1) Reguläres BR-Mitglied (Befehl: role member)",
    "2) BR-Vorsitzende/r (Befehl: role chair)",
  ]);
}

function roleLabel(role) {
  return role === "chair" ? "BR-Vorsitz" : "Reguläres BR-Mitglied";
}

function renderStatus() {
  dayStatus.textContent = `Tag ${state.day} / ${state.totalDays} · Zeitslot ${state.slot} von ${state.slotsPerDay}`;

  metricsList.innerHTML = "";
  Object.entries(state.metrics).forEach(([key, value]) => {
    const li = document.createElement("li");
    li.textContent = `${key}: ${value}`;
    metricsList.appendChild(li);
  });

  gremiumStatus.innerHTML = "";
  const cohesion = document.createElement("p");
  cohesion.textContent = `Teamkohäsion: ${state.metrics.teamCohesion}`;
  gremiumStatus.appendChild(cohesion);
  const factions = document.createElement("p");
  factions.textContent = `Fraktionen: ${state.factions.map((f) => `${f.name} (${f.mood})`).join(", ")}`;
  gremiumStatus.appendChild(factions);
  const members = document.createElement("p");
  members.textContent = `Schlüsselpersonen: ${state.keyMembers
    .map((m) => `${m.name} (${m.tendency})`)
    .join(", ")}`;
  gremiumStatus.appendChild(members);
  const escalation = document.createElement("p");
  escalation.textContent = `Eskalationslevel: ${state.escalationLevel}`;
  gremiumStatus.appendChild(escalation);
  const gbr = document.createElement("p");
  gbr.textContent = `GBR-Beziehung: ${state.gbrRelationship}`;
  gremiumStatus.appendChild(gbr);

  deadlinesList.innerHTML = "";
  if (state.pendingDeadlines.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Keine offenen Fristen";
    deadlinesList.appendChild(li);
  } else {
    state.pendingDeadlines.forEach((deadline) => {
      const li = document.createElement("li");
      li.textContent = `${deadline.title} (noch ${deadline.daysLeft} Tage)`;
      deadlinesList.appendChild(li);
    });
  }

  docStatus.textContent = `Notizen: ${state.notes.length} · Akten: ${state.caseFiles.length} · Protokollqualität: ${state.meetingMinutesQuality} · Formalstatus: ${state.formalStatus}`;
}

function handleCommand(input) {
  const trimmed = input.trim();
  if (!trimmed) return;
  addLine(`> ${trimmed}`, "accent");

  const [command, ...args] = trimmed.split(" ");

  switch (command.toLowerCase()) {
    case "help":
      showHelp();
      break;
    case "role":
      setRole(args[0]);
      break;
    case "next":
      advanceTime();
      break;
    case "choose":
      chooseOption(args[0]);
      break;
    case "status":
      showStatus();
      break;
    case "log":
      showLog();
      break;
    case "knowledge":
      showKnowledge();
      break;
    case "save":
      saveState();
      addLine("Status gespeichert.");
      break;
    case "load":
      state = loadState();
      addLine("Gespeicherter Status geladen.");
      renderStatus();
      break;
    case "reset":
      resetState();
      addLine("Simulation zurückgesetzt.", "warning");
      showRolePrompt();
      renderStatus();
      break;
    case "answer":
      recordReflection(args);
      break;
    default:
      addLine("Unbekannter Befehl. 'help' zeigt alle Befehle.", "warning");
  }
}

function showHelp() {
  addBlock([
    "Befehle:",
    "- role member | role chair: Rolle festlegen",
    "- next: Zeitslot fortschreiten & Event auslösen",
    "- choose <nummer>: Option im aktuellen Event wählen",
    "- status: Kurzstatus ausgeben",
    "- log: Letzte Ereignisse anzeigen",
    "- knowledge: Wissen/Regelhinweis abrufen",
    "- save/load: lokalen Spielstand speichern/laden",
    "- export/import: Buttons oben nutzen",
    "- reset: Simulation zurücksetzen",
    "- answer <nr> <text>: Reflexionsfragen beantworten",
  ]);
}

function setRole(role) {
  if (state.role) {
    addLine("Rolle bereits gesetzt. Bitte 'reset' nutzen, um neu zu starten.", "warning");
    return;
  }
  if (role === "member" || role === "chair") {
    state.role = role;
    state.currentMode = "running";
    saveState();
    addLine(`Rolle gesetzt: ${roleLabel(role)}.`, "accent");
    addLine("Tag startet. Nutze 'next', um fortzufahren.");
    renderStatus();
  } else {
    addLine("Bitte 'role member' oder 'role chair' verwenden.", "warning");
  }
}

function advanceTime() {
  if (!state.role) {
    showRolePrompt();
    return;
  }

  if (state.day > state.totalDays) {
    addLine("Die Simulation ist bereits abgeschlossen.", "warning");
    return;
  }

  state.slot += 1;
  if (state.slot > state.slotsPerDay) {
    state.slot = 1;
    state.day += 1;
  }

  applyDeadlines();

  if (state.day > state.totalDays) {
    finishSimulation();
  } else {
    triggerEvent();
  }

  saveState();
  renderStatus();
}

function applyDeadlines() {
  state.pendingDeadlines.forEach((deadline) => {
    deadline.daysLeft -= 1;
  });

  const overdue = state.pendingDeadlines.filter((d) => d.daysLeft <= 0);
  if (overdue.length > 0) {
    overdue.forEach((deadline) => {
      addLine(`Frist verpasst: ${deadline.title}`, "danger");
      applyEffects(deadline.consequence || {});
      logEvent(`Frist verpasst: ${deadline.title}`);
    });
    state.pendingDeadlines = state.pendingDeadlines.filter((d) => d.daysLeft > 0);
  }
}

function triggerEvent() {
  const pool = [
    ...contentStore.events,
    ...contentStore.cases,
    ...contentStore.negotiations,
    ...contentStore.gbr,
    ...contentStore.conciliation,
  ];

  const eligible = pool.filter((event) => event.roles.includes(state.role));
  const event = eligible[Math.floor(Math.random() * eligible.length)];

  if (!event) {
    addLine("Kein passendes Event gefunden.", "warning");
    return;
  }

  state.currentEvent = event;
  state.currentOptions = event.options || [];

  addLine(`Event: ${event.title}`, "accent");
  addBlock(event.description.split("\n"));

  if (event.options && event.options.length > 0) {
    event.options.forEach((option, index) => {
      addLine(`${index + 1}) ${option.label}`);
    });
    addLine("Treffe eine Entscheidung mit 'choose <nummer>'.", "warning");
  } else {
    addLine("Kein Entscheidungsbedarf in diesem Event.");
  }
}

function chooseOption(index) {
  if (!state.currentEvent) {
    addLine("Kein aktives Event.", "warning");
    return;
  }

  const optionIndex = Number.parseInt(index, 10) - 1;
  const option = state.currentOptions[optionIndex];
  if (!option) {
    addLine("Ungültige Option.", "warning");
    return;
  }

  addLine(`Entscheidung: ${option.label}`, "accent");
  applyEffects(option.effects || {});
  if (option.followUp) {
    addBlock(option.followUp.split("\n"));
  }
  logEvent(`${state.currentEvent.title} → ${option.label}`);

  state.currentEvent = null;
  state.currentOptions = [];
  saveState();
  renderStatus();
}

function applyEffects(effects) {
  if (effects.metrics) {
    Object.entries(effects.metrics).forEach(([key, delta]) => {
      state.metrics[key] = clamp((state.metrics[key] || 0) + delta);
    });
  }

  if (effects.teamCohesion) {
    state.metrics.teamCohesion = clamp(state.metrics.teamCohesion + effects.teamCohesion);
  }

  if (effects.formalStatus) {
    state.formalStatus = effects.formalStatus;
  }

  if (effects.addDeadline) {
    state.pendingDeadlines.push({
      title: effects.addDeadline.title,
      daysLeft: effects.addDeadline.days,
      consequence: effects.addDeadline.consequence,
    });
    addLine(`Neue Frist: ${effects.addDeadline.title} (${effects.addDeadline.days} Tage)`, "warning");
  }

  if (effects.addNote) {
    state.notes.push({ quality: effects.addNote.quality, topic: effects.addNote.topic });
  }

  if (effects.addCaseFile) {
    state.caseFiles.push({ name: effects.addCaseFile.name, strength: effects.addCaseFile.strength });
  }

  if (effects.meetingMinutesQuality) {
    state.meetingMinutesQuality = clamp(
      state.meetingMinutesQuality + effects.meetingMinutesQuality
    );
  }

  if (effects.escalationLevel) {
    state.escalationLevel = effects.escalationLevel;
  }

  if (effects.gbrRelationship) {
    state.gbrRelationship = clamp(state.gbrRelationship + effects.gbrRelationship);
  }

  if (effects.stressDelta) {
    state.metrics.stress = clamp(state.metrics.stress + effects.stressDelta);
  }
}

function logEvent(text) {
  state.log.push({ day: state.day, slot: state.slot, text });
  if (state.log.length > 20) {
    state.log.shift();
  }
}

function showStatus() {
  addBlock([
    `Tag ${state.day}/${state.totalDays} · Slot ${state.slot}/${state.slotsPerDay}`,
    `Rolle: ${roleLabel(state.role)}`,
    `Teamkohäsion: ${state.metrics.teamCohesion} · Formalstatus: ${state.formalStatus}`,
    `Fristen offen: ${state.pendingDeadlines.length}`,
    `Eskalation: ${state.escalationLevel} · GBR-Beziehung: ${state.gbrRelationship}`,
  ]);
}

function showLog() {
  if (state.log.length === 0) {
    addLine("Noch keine Ereignisse protokolliert.");
    return;
  }
  addLine("Letzte Ereignisse:");
  state.log.slice(-10).forEach((entry) => {
    addLine(`Tag ${entry.day} · Slot ${entry.slot}: ${entry.text}`);
  });
}

function showKnowledge() {
  const entry = contentStore.knowledge[Math.floor(Math.random() * contentStore.knowledge.length)];
  if (!entry) {
    addLine("Kein Wissenseintrag verfügbar.", "warning");
    return;
  }
  addLine(`Wissen: ${entry.title}`, "accent");
  addBlock(entry.body.split("\n"));
}

function finishSimulation() {
  addLine("Simulation beendet. Auswertung folgt...", "accent");
  const summary = generateSummary();
  addBlock(summary);
  addLine("Reflexionsfragen:", "accent");
  reflectionQuestions.forEach((question, index) => {
    addLine(`${index + 1}) ${question}`);
  });
  addLine("Antworte mit 'answer <nummer> <text>'.", "warning");
}

function generateSummary() {
  const { trustEmployees, trustEmployer, teamCohesion, legalRisk, stress } = state.metrics;
  const summary = [
    `Vertrauen Mitarbeitende: ${trustEmployees}/100`,
    `Vertrauen Arbeitgeber: ${trustEmployer}/100`,
    `Teamkohäsion: ${teamCohesion}/100`,
    `Rechtsrisiko: ${legalRisk}/100`,
    `Stresslevel: ${stress}/100`,
    `Fallakten: ${state.caseFiles.length} · Notizen: ${state.notes.length}`,
  ];

  const verdict = [];
  if (teamCohesion >= 70) verdict.push("starkes Gremium");
  if (legalRisk >= 60) verdict.push("hohes Rechtsrisiko");
  if (stress >= 70) verdict.push("Überlastungssignale");
  if (trustEmployees >= 70) verdict.push("hohe Mitarbeiterbindung");
  if (trustEmployer <= 30) verdict.push("angespanntes AG-Verhältnis");

  summary.push(`Einordnung: ${verdict.join(", ") || "ausbalancierte Lage"}`);
  summary.push("Hinweis: Simulation ist eine Annäherung und keine Rechtsberatung.");

  return summary;
}

function recordReflection(args) {
  if (state.day <= state.totalDays) {
    addLine("Reflexion ist erst am Ende der Simulation möglich.", "warning");
    return;
  }

  const [indexText, ...answerParts] = args;
  const index = Number.parseInt(indexText, 10);
  if (!index || index < 1 || index > reflectionQuestions.length) {
    addLine("Bitte eine gültige Fragenummer angeben.", "warning");
    return;
  }
  const answer = answerParts.join(" ");
  if (!answer) {
    addLine("Bitte eine Antwort hinzufügen.", "warning");
    return;
  }
  state.reflectionAnswers[index] = answer;
  addLine(`Antwort gespeichert für Frage ${index}.`, "accent");
  saveState();
}

exportBtn.addEventListener("click", () => {
  const data = JSON.stringify(state, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "br-simulator-export.json";
  link.click();
  URL.revokeObjectURL(url);
});

importFile.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      state = JSON.parse(reader.result);
      saveState();
      addLine("Import erfolgreich.", "accent");
      renderStatus();
    } catch (error) {
      addLine("Import fehlgeschlagen.", "danger");
    }
  };
  reader.readAsText(file);
});

commandForm.addEventListener("submit", (event) => {
  event.preventDefault();
  handleCommand(commandInput.value);
  commandInput.value = "";
});

loadContent().then(init).catch((error) => {
  addLine("Content konnte nicht geladen werden.", "danger");
  console.error(error);
});
