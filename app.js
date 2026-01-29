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
const TOTAL_DAYS = 7;

const reflectionQuestions = [
  "Wie hast du dich in der Rolle gefühlt?",
  "Was war belastend?",
  "Was war überraschend?",
  "Was hat dich motiviert?",
  "Kannst du dir vorstellen, diese Rolle real zu übernehmen?",
  "Was würde dich daran hindern?",
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
  gremiumMembers: [
    {
      name: "Sabine",
      profile: "pragmatisch",
      faction: "Pragmatisch",
      trust: 60,
      conflictMarker: 0,
    },
    {
      name: "Ramon",
      profile: "kämpferisch",
      faction: "Konfrontativ",
      trust: 55,
      conflictMarker: 1,
    },
    {
      name: "Hana",
      profile: "juristisch",
      faction: "Vorsichtig",
      trust: 58,
      conflictMarker: 0,
    },
    {
      name: "Tom",
      profile: "harmonieorientiert",
      faction: "Pragmatisch",
      trust: 62,
      conflictMarker: 0,
    },
    {
      name: "Lea",
      profile: "vorsichtig",
      faction: "Vorsichtig",
      trust: 57,
      conflictMarker: 1,
    },
  ],
  pendingDeadlines: [],
  formalStatus: "korrekt",
  notes: [],
  caseFiles: [],
  meetingMinutesQuality: 65,
  gbrRelationship: 50,
  escalationLevel: "none",
  skillsProfile: {
    konfliktstil: 0,
    strukturgrad: 0,
    schutzfokus: 0,
    eskalationsneigung: 0,
    kommunikationsstil: 0,
    belastungsresistenz: 0,
  },
  chronicle: [],
  guidedActionsEnabled: true,
  lastGuidanceReasons: [],
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

function normalizeCommand(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss");
}

function logChronicle(entry) {
  state.chronicle.push({
    day: state.day,
    slot: state.slot,
    ...entry,
  });
  if (state.chronicle.length > 50) {
    state.chronicle.shift();
  }
}

function updateSkillProfile(skill, delta) {
  if (Object.prototype.hasOwnProperty.call(state.skillsProfile, skill)) {
    state.skillsProfile[skill] = clamp(state.skillsProfile[skill] + delta, -100, 100);
  }
}

function stressTier() {
  if (state.metrics.stress >= 75) return "hoch";
  if (state.metrics.stress >= 55) return "erhoeht";
  return "normal";
}

function applyStressConsequences() {
  if (state.metrics.stress < 70) return;
  if (Math.random() < 0.35) {
    state.metrics.teamCohesion = clamp(state.metrics.teamCohesion - 4);
    state.metrics.trustEmployees = clamp(state.metrics.trustEmployees - 2);
    addLine("Hoher Stress führt zu Spannungen im Gremium.", "warning");
    logChronicle({ type: "stress", text: "Stress belastet die Zusammenarbeit im Gremium." });
  }
  if (Math.random() < 0.25 && state.pendingDeadlines.length > 0) {
    const missed = state.pendingDeadlines.shift();
    addLine(`Stressbedingter Fehler: Frist versäumt (${missed.title}).`, "danger");
    applyEffects(missed.consequence || {});
    logChronicle({ type: "frist", text: `Stressbedingte Fristversäumnis: ${missed.title}` });
  }
}

function showGuidedActions(context = "allgemein") {
  if (!state.guidedActionsEnabled) return;
  const { suggestions, reasons } = generateGuidedActions();
  state.lastGuidanceReasons = reasons;
  addLine("💡 Mögliche nächste Schritte:", "accent");
  if (suggestions.length === 0) {
    addLine("- weiter", "warning");
    return;
  }
  suggestions.forEach((suggestion) => {
    addLine(`- ${suggestion}`);
  });
}

function generateGuidedActions() {
  const suggestions = [];
  const reasons = [];
  const stressState = stressTier();
  if (!state.role) {
    suggestions.push("rolle mitglied", "rolle vorsitz");
    reasons.push("Rolle ist noch nicht gewählt.");
    return { suggestions, reasons };
  }

  if (state.currentEvent && state.currentOptions.length > 0) {
    state.currentOptions.forEach((_, index) => {
      suggestions.push(`waehlen ${index + 1}`);
    });
    reasons.push("Es gibt eine offene Entscheidung im aktuellen Event.");
  }

  if (state.pendingDeadlines.length > 0) {
    suggestions.push("fristen");
    reasons.push("Offene Fristen erfordern zeitnahe Prüfung.");
  }

  if (state.caseFiles.length > 0) {
    suggestions.push("faelle");
    reasons.push("Aktive Fälle können nachbearbeitet werden.");
  }

  if (stressState !== "normal") {
    suggestions.push("pause nehmen", "kollegiales gespraech");
    reasons.push("Stress ist erhöht und benötigt Selbstschutzmaßnahmen.");
  }

  if (state.role === "chair") {
    suggestions.push("gremium status", "sitzung starten");
    reasons.push("Als Vorsitz sind Moderation und Strukturierung zentral.");
  } else {
    suggestions.push("gremium sprechen sabine", "notiz anlegen solide stand der faelle");
    reasons.push("Als Mitglied unterstützt du das Gremium durch Zuarbeit.");
  }

  if (state.escalationLevel === "gbr") {
    suggestions.push("eskalieren gbr");
    reasons.push("Ein GBR-Prozess ist aktiv und braucht Koordination.");
  }

  if (state.escalationLevel === "conciliation") {
    suggestions.push("einigungsstelle starten");
    reasons.push("Die Einigungsstelle erfordert Vorbereitung und nächste Schritte.");
  }

  if (!state.currentEvent) {
    suggestions.push("posteingang", "weiter");
    reasons.push("Neue Ereignisse warten im Posteingang.");
  }

  return { suggestions: Array.from(new Set(suggestions)).slice(0, 6), reasons };
}

function explainGuidance() {
  if (!state.lastGuidanceReasons || state.lastGuidanceReasons.length === 0) {
    addLine("Aktuell liegen keine speziellen Hinweise vor.");
    return;
  }
  addLine("Warum diese Vorschläge?", "accent");
  state.lastGuidanceReasons.forEach((reason) => addLine(`- ${reason}`));
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
    showGuidedActions("start");
  } else {
    addLine(`Aktuelle Rolle: ${roleLabel(state.role)}.`, "accent");
    addLine("Nutze 'hilfe' für Befehle.");
    showGuidedActions("start");
  }
}

function showRolePrompt() {
  addBlock([
    "Bitte wähle deine Rolle:",
    "1) Reguläres BR-Mitglied (Befehl: rolle mitglied)",
    "2) BR-Vorsitz (Befehl: rolle vorsitz)",
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
  const escalation = document.createElement("p");
  escalation.textContent = `Eskalationslevel: ${state.escalationLevel}`;
  gremiumStatus.appendChild(escalation);
  const gbr = document.createElement("p");
  gbr.textContent = `GBR-Beziehung: ${state.gbrRelationship}`;
  gremiumStatus.appendChild(gbr);
  const memberList = document.createElement("p");
  memberList.textContent = `Mitglieder: ${state.gremiumMembers
    .map((member) => `${member.name} (${member.profile}, Vertrauen ${member.trust})`)
    .join(" · ")}`;
  gremiumStatus.appendChild(memberList);

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

  docStatus.textContent = `Notizen: ${state.notes.length} · Akten: ${state.caseFiles.length} · Protokollqualität: ${state.meetingMinutesQuality} · Formalstatus: ${state.formalStatus} · Stresslage: ${stressTier()}`;
}

function handleCommand(input) {
  const trimmed = input.trim();
  if (!trimmed) return;
  addLine(`> ${trimmed}`, "accent");

  const normalized = normalizeCommand(trimmed);

  if (normalized === "hilfe") {
    showHelp();
    showGuidedActions("hilfe");
    return;
  }
  if (normalized.startsWith("rolle ")) {
    const [, role] = normalized.split(" ");
    setRole(role);
    return;
  }
  if (normalized === "weiter") {
    advanceTime();
    return;
  }
  if (normalized.startsWith("waehlen ")) {
    const [, optionIndex] = normalized.split(" ");
    chooseOption(optionIndex);
    return;
  }
  if (normalized.startsWith("wählen ")) {
    const [, optionIndex] = trimmed.split(" ");
    chooseOption(optionIndex);
    return;
  }
  if (normalized === "status") {
    showStatus();
    showGuidedActions("status");
    return;
  }
  if (normalized === "protokoll") {
    showLog();
    showGuidedActions("protokoll");
    return;
  }
  if (normalized === "wissen") {
    showKnowledge();
    showGuidedActions("wissen");
    return;
  }
  if (normalized === "posteingang") {
    openInbox();
    showGuidedActions("posteingang");
    return;
  }
  if (normalized === "faelle") {
    listCases();
    showGuidedActions("faelle");
    return;
  }
  if (normalized === "fristen") {
    listDeadlines();
    showGuidedActions("fristen");
    return;
  }
  if (normalized === "gremium status") {
    showGremiumStatus();
    showGuidedActions("gremium");
    return;
  }
  if (normalized.startsWith("gremium sprechen ")) {
    const name = trimmed.split(" ").slice(2).join(" ");
    speakToMember(name);
    showGuidedActions("gremium");
    return;
  }
  if (normalized === "sitzung starten") {
    startMeeting();
    showGuidedActions("sitzung");
    return;
  }
  if (normalized === "abstimmen") {
    holdVote();
    showGuidedActions("abstimmung");
    return;
  }
  if (normalized.startsWith("notiz anlegen ")) {
    const parts = trimmed.split(" ").slice(2);
    addNoteCommand(parts);
    showGuidedActions("notiz");
    return;
  }
  if (normalized === "pause nehmen") {
    takeBreak();
    showGuidedActions("pause");
    return;
  }
  if (normalized === "aufgabe delegieren") {
    delegateTask();
    showGuidedActions("delegieren");
    return;
  }
  if (normalized === "schulung besuchen") {
    attendTraining();
    showGuidedActions("schulung");
    return;
  }
  if (normalized === "kollegiales gespraech") {
    peerTalk();
    showGuidedActions("kollegial");
    return;
  }
  if (normalized === "eskalieren gbr") {
    escalateToGbr();
    showGuidedActions("gbr");
    return;
  }
  if (normalized === "einigungsstelle starten") {
    startConciliation();
    showGuidedActions("conciliation");
    return;
  }
  if (normalized === "kompetenz") {
    showSkillsProfile();
    showGuidedActions("kompetenz");
    return;
  }
  if (normalized === "chronik") {
    showChronicle();
    showGuidedActions("chronik");
    return;
  }
  if (normalized === "fuehrung aus") {
    state.guidedActionsEnabled = false;
    addLine("Geführte Hinweise sind jetzt deaktiviert.");
    saveState();
    return;
  }
  if (normalized === "fuehrung an") {
    state.guidedActionsEnabled = true;
    addLine("Geführte Hinweise sind jetzt aktiv.", "accent");
    showGuidedActions("fuehrung");
    saveState();
    return;
  }
  if (normalized === "hinweis") {
    explainGuidance();
    return;
  }
  if (normalized === "speichern") {
    saveState();
    addLine("Status gespeichert.");
    return;
  }
  if (normalized === "laden") {
    state = loadState();
    addLine("Gespeicherter Status geladen.");
    renderStatus();
    showGuidedActions("laden");
    return;
  }
  if (normalized === "zuruecksetzen") {
    resetState();
    addLine("Simulation zurückgesetzt.", "warning");
    showRolePrompt();
    renderStatus();
    showGuidedActions("reset");
    return;
  }
  if (normalized.startsWith("antwort ")) {
    recordReflection(trimmed.split(" ").slice(1));
    return;
  }

  addLine("Unbekannter Befehl. 'hilfe' zeigt alle Befehle.", "warning");
  showGuidedActions("fehler");
}

function showHelp() {
  addBlock([
    "Befehle:",
    "- rolle mitglied | rolle vorsitz: Rolle festlegen",
    "- weiter: Zeitslot fortschreiten & Event auslösen",
    "- waehlen <nummer>: Option im aktuellen Event wählen",
    "- status: Kurzstatus ausgeben",
    "- posteingang: aktuelles Ereignis anzeigen",
    "- faelle: aktive Fallakten anzeigen",
    "- fristen: offene Fristen anzeigen",
    "- gremium status: Gremiumsübersicht",
    "- gremium sprechen <name>: Mitglied ansprechen",
    "- sitzung starten: Gremium fokussieren",
    "- abstimmen: Beschluss simulieren",
    "- notiz anlegen <qualitaet> <thema>: Notiz erfassen",
    "- pause nehmen | aufgabe delegieren | schulung besuchen | kollegiales gespraech",
    "- eskalieren gbr | einigungsstelle starten",
    "- kompetenz: Kompetenzprofil anzeigen",
    "- chronik: Amtszeit-chronik anzeigen",
    "- fuehrung an | fuehrung aus | hinweis",
    "- speichern | laden | zuruecksetzen",
    "- antwort <nr> <text>: Reflexionsfragen beantworten",
  ]);
}

function setRole(role) {
  if (state.role) {
    addLine("Rolle bereits gesetzt. Bitte 'zuruecksetzen' nutzen, um neu zu starten.", "warning");
    return;
  }
  if (role === "mitglied" || role === "vorsitz") {
    state.role = role === "vorsitz" ? "chair" : "member";
    state.currentMode = "running";
    saveState();
    addLine(`Rolle gesetzt: ${roleLabel(state.role)}.`, "accent");
    addLine("Tag startet. Nutze 'weiter', um fortzufahren.");
    renderStatus();
    showGuidedActions("rolle");
  } else {
    addLine("Bitte 'rolle mitglied' oder 'rolle vorsitz' verwenden.", "warning");
    showGuidedActions("rolle");
  }
}

function advanceTime() {
  if (!state.role) {
    showRolePrompt();
    showGuidedActions("rolle");
    return;
  }

  if (state.day > state.totalDays) {
    addLine("Die Simulation ist bereits abgeschlossen.", "warning");
    showGuidedActions("ende");
    return;
  }

  const previousDay = state.day;
  state.slot += 1;
  if (state.slot > state.slotsPerDay) {
    state.slot = 1;
    state.day += 1;
  }

  applyDeadlines();
  applyStressConsequences();

  if (state.day > state.totalDays) {
    finishSimulation();
  } else {
    if (state.day !== previousDay) {
      addLine(`Neuer Tag beginnt: Tag ${state.day}.`, "accent");
      logChronicle({ type: "tag", text: `Tag ${state.day} beginnt.` });
    }
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
      logChronicle({ type: "frist", text: `Frist versäumt: ${deadline.title}` });
    });
    state.pendingDeadlines = state.pendingDeadlines.filter((d) => d.daysLeft > 0);
  }
}

function triggerEvent() {
  const pool = [
    ...contentStore.events.map((event) => ({ ...event, category: "event" })),
    ...contentStore.cases.map((event) => ({ ...event, category: "case" })),
    ...contentStore.negotiations.map((event) => ({ ...event, category: "negotiation" })),
    ...contentStore.gbr.map((event) => ({ ...event, category: "gbr" })),
    ...contentStore.conciliation.map((event) => ({ ...event, category: "conciliation" })),
  ];

  const eligible = pool.filter((event) => event.roles.includes(state.role));
  const event = eligible[Math.floor(Math.random() * eligible.length)];

  if (!event) {
    addLine("Kein passendes Event gefunden.", "warning");
    return;
  }

  state.currentEvent = event;
  state.currentOptions = applyStressToOptions(event.options || []);

  addLine(`Event: ${event.title}`, "accent");
  addBlock(event.description.split("\n"));

  if (state.currentOptions.length > 0) {
    state.currentOptions.forEach((option, index) => {
      addLine(`${index + 1}) ${option.label}`);
    });
    addLine("Treffe eine Entscheidung mit 'waehlen <nummer>'.", "warning");
  } else {
    addLine("Kein Entscheidungsbedarf in diesem Event.");
  }
  showGuidedActions("event");
}

function applyStressToOptions(options) {
  if (state.metrics.stress < 70 || options.length <= 1) {
    return options;
  }
  const reduced = options.slice();
  reduced.splice(Math.floor(Math.random() * reduced.length), 1);
  addLine("Hoher Stress schränkt deine Optionen ein.", "warning");
  return reduced;
}

function chooseOption(index) {
  if (!state.currentEvent) {
    addLine("Kein aktives Event.", "warning");
    showGuidedActions("event");
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
  logChronicle({
    type: state.currentEvent.category || "ereignis",
    text: `${state.currentEvent.title}: ${option.label}`,
  });

  state.currentEvent = null;
  state.currentOptions = [];
  saveState();
  renderStatus();
  showGuidedActions("entscheidung");
}

function applyEffects(effects) {
  if (effects.metrics) {
    Object.entries(effects.metrics).forEach(([key, delta]) => {
      state.metrics[key] = clamp((state.metrics[key] || 0) + delta);
      if (key === "trustEmployer" && delta < 0) {
        updateSkillProfile("konfliktstil", 3);
      }
      if (key === "trustEmployer" && delta > 0) {
        updateSkillProfile("kommunikationsstil", 2);
      }
      if (key === "trustEmployees" && delta > 0) {
        updateSkillProfile("schutzfokus", 3);
      }
    });
  }

  if (effects.teamCohesion) {
    state.metrics.teamCohesion = clamp(state.metrics.teamCohesion + effects.teamCohesion);
    state.gremiumMembers = state.gremiumMembers.map((member) => ({
      ...member,
      trust: clamp(member.trust + Math.sign(effects.teamCohesion) * 2),
    }));
    if (effects.teamCohesion < 0) {
      logChronicle({ type: "gremium", text: "Gremienspannungen nehmen zu." });
    }
  }

  if (effects.formalStatus) {
    state.formalStatus = effects.formalStatus;
    updateSkillProfile("strukturgrad", effects.formalStatus === "korrekt" ? 2 : -3);
  }

  if (effects.addDeadline) {
    state.pendingDeadlines.push({
      title: effects.addDeadline.title,
      daysLeft: effects.addDeadline.days,
      consequence: effects.addDeadline.consequence,
    });
    addLine(`Neue Frist: ${effects.addDeadline.title} (${effects.addDeadline.days} Tage)`, "warning");
    logChronicle({ type: "frist", text: `Neue Frist gesetzt: ${effects.addDeadline.title}` });
  }

  if (effects.addNote) {
    state.notes.push({ quality: effects.addNote.quality, topic: effects.addNote.topic });
    updateSkillProfile("strukturgrad", effects.addNote.quality === "belastbar" ? 3 : 1);
  }

  if (effects.addCaseFile) {
    state.caseFiles.push({ name: effects.addCaseFile.name, strength: effects.addCaseFile.strength });
    logChronicle({ type: "fall", text: `Fallakte angelegt: ${effects.addCaseFile.name}` });
  }

  if (effects.meetingMinutesQuality) {
    state.meetingMinutesQuality = clamp(
      state.meetingMinutesQuality + effects.meetingMinutesQuality
    );
    updateSkillProfile("strukturgrad", Math.sign(effects.meetingMinutesQuality) * 2);
  }

  if (effects.escalationLevel) {
    if (effects.escalationLevel !== state.escalationLevel) {
      logChronicle({
        type: "eskalation",
        text: `Eskalationslevel geändert: ${effects.escalationLevel}`,
      });
    }
    state.escalationLevel = effects.escalationLevel;
    updateSkillProfile("eskalationsneigung", effects.escalationLevel === "none" ? -2 : 4);
  }

  if (effects.gbrRelationship) {
    state.gbrRelationship = clamp(state.gbrRelationship + effects.gbrRelationship);
  }

  if (effects.stressDelta) {
    state.metrics.stress = clamp(state.metrics.stress + effects.stressDelta);
  }

  if (effects.skills) {
    Object.entries(effects.skills).forEach(([skill, delta]) => {
      updateSkillProfile(skill, delta);
    });
  }

  if (effects.memberTrust) {
    state.gremiumMembers = state.gremiumMembers.map((member) => ({
      ...member,
      trust: clamp(member.trust + (effects.memberTrust[member.name] || 0)),
    }));
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
    `Stress: ${state.metrics.stress} · Arbeitslast: ${state.metrics.workload}`,
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

function openInbox() {
  if (state.currentEvent) {
    addLine(`Aktives Event: ${state.currentEvent.title}`, "accent");
    addBlock(state.currentEvent.description.split("\n"));
    state.currentOptions.forEach((option, index) => {
      addLine(`${index + 1}) ${option.label}`);
    });
    addLine("Treffe eine Entscheidung mit 'waehlen <nummer>'.", "warning");
    return;
  }
  triggerEvent();
}

function listCases() {
  if (state.caseFiles.length === 0) {
    addLine("Keine aktiven Fallakten.");
    return;
  }
  addLine("Aktive Fallakten:", "accent");
  state.caseFiles.forEach((file, index) => {
    addLine(`${index + 1}) ${file.name} (${file.strength})`);
  });
}

function listDeadlines() {
  if (state.pendingDeadlines.length === 0) {
    addLine("Keine offenen Fristen.");
    return;
  }
  addLine("Offene Fristen:", "accent");
  state.pendingDeadlines.forEach((deadline, index) => {
    addLine(`${index + 1}) ${deadline.title} · ${deadline.daysLeft} Tage`);
  });
}

function showGremiumStatus() {
  addLine("Gremium status:", "accent");
  state.gremiumMembers.forEach((member) => {
    addLine(
      `${member.name}: ${member.profile} · Vertrauen ${member.trust} · Konfliktmarker ${member.conflictMarker}`
    );
  });
}

function speakToMember(name) {
  if (!name) {
    addLine("Bitte einen Namen angeben (z. B. 'gremium sprechen sabine').", "warning");
    return;
  }
  const member = state.gremiumMembers.find(
    (entry) => entry.name.toLowerCase() === name.trim().toLowerCase()
  );
  if (!member) {
    addLine("Mitglied nicht gefunden.", "warning");
    return;
  }
  const stressState = stressTier();
  if (stressState === "hoch") {
    member.trust = clamp(member.trust - 3);
    member.conflictMarker += 1;
    addLine(`${member.name} reagiert gereizt auf die angespannte Stimmung.`, "warning");
    logChronicle({ type: "gremium", text: `${member.name} fühlt sich übergangen.` });
  } else {
    member.trust = clamp(member.trust + 3);
    member.conflictMarker = Math.max(0, member.conflictMarker - 1);
    addLine(`${member.name} fühlt sich eingebunden und unterstützt dich.`, "accent");
    updateSkillProfile("kommunikationsstil", 2);
  }
}

function startMeeting() {
  if (state.role !== "chair") {
    addLine("Nur der Vorsitz kann eine Sitzung starten.", "warning");
    return;
  }
  state.metrics.teamCohesion = clamp(state.metrics.teamCohesion + 4);
  state.metrics.workload = clamp(state.metrics.workload + 3);
  state.meetingMinutesQuality = clamp(state.meetingMinutesQuality + 3);
  addLine("Sitzung gestartet. Das Gremium bündelt sich.", "accent");
  logChronicle({ type: "beschluss", text: "Sitzung gestartet und Agenda fokussiert." });
}

function holdVote() {
  const averageTrust =
    state.gremiumMembers.reduce((sum, member) => sum + member.trust, 0) / state.gremiumMembers.length;
  const cohesionFactor = state.metrics.teamCohesion;
  const passed = averageTrust + cohesionFactor > 120;
  if (passed) {
    addLine("Beschluss angenommen. Das Gremium steht hinter der Entscheidung.", "accent");
    state.metrics.teamCohesion = clamp(state.metrics.teamCohesion + 3);
    updateSkillProfile("kommunikationsstil", 2);
    logChronicle({ type: "beschluss", text: "Beschluss gefasst." });
  } else {
    addLine("Beschluss gescheitert. Das Gremium bleibt gespalten.", "warning");
    state.metrics.teamCohesion = clamp(state.metrics.teamCohesion - 4);
    state.gremiumMembers.forEach((member) => {
      member.conflictMarker += 1;
      member.trust = clamp(member.trust - 2);
    });
    logChronicle({ type: "gremium", text: "Beschluss scheitert an internen Konflikten." });
  }
}

function addNoteCommand(parts) {
  const quality = parts[0];
  const topic = parts.slice(1).join(" ");
  if (!quality || !topic) {
    addLine("Bitte Qualität und Thema angeben (z. B. 'notiz anlegen solide frist').", "warning");
    return;
  }
  state.notes.push({ quality, topic });
  addLine(`Notiz erfasst (${quality}): ${topic}`, "accent");
  updateSkillProfile("strukturgrad", quality === "belastbar" ? 3 : 1);
}

function takeBreak() {
  state.metrics.stress = clamp(state.metrics.stress - 8);
  state.metrics.workload = clamp(state.metrics.workload - 2);
  updateSkillProfile("belastungsresistenz", 3);
  addLine("Du nimmst dir bewusst eine Pause und stabilisierst dich.", "accent");
  logChronicle({ type: "selbstschutz", text: "Pause genommen, Stress reduziert." });
}

function delegateTask() {
  state.metrics.workload = clamp(state.metrics.workload - 4);
  state.metrics.stress = clamp(state.metrics.stress - 3);
  state.metrics.teamCohesion = clamp(state.metrics.teamCohesion + 1);
  addLine("Du delegierst Aufgaben und entlastest dich.", "accent");
  updateSkillProfile("kommunikationsstil", 1);
}

function attendTraining() {
  state.metrics.workload = clamp(state.metrics.workload + 2);
  state.metrics.stress = clamp(state.metrics.stress - 3);
  updateSkillProfile("strukturgrad", 2);
  updateSkillProfile("belastungsresistenz", 2);
  addLine("Du besuchst eine Schulung und stärkst deine Kompetenzen.", "accent");
  logChronicle({ type: "entwicklung", text: "Schulung besucht." });
}

function peerTalk() {
  state.metrics.stress = clamp(state.metrics.stress - 5);
  state.metrics.teamCohesion = clamp(state.metrics.teamCohesion + 2);
  updateSkillProfile("kommunikationsstil", 2);
  addLine("Das kollegiale Gespräch bringt Entlastung und Perspektive.", "accent");
}

function escalateToGbr() {
  if (state.role !== "chair") {
    addLine("Nur der Vorsitz kann offiziell an den GBR eskalieren.", "warning");
    return;
  }
  state.escalationLevel = "gbr";
  state.gbrRelationship = clamp(state.gbrRelationship + 3);
  addLine("Eskalation an den GBR vorbereitet.", "accent");
  logChronicle({ type: "eskalation", text: "Eskalation an den GBR eingeleitet." });
}

function startConciliation() {
  if (state.role !== "chair") {
    addLine("Nur der Vorsitz kann eine Einigungsstelle starten.", "warning");
    return;
  }
  state.escalationLevel = "conciliation";
  state.metrics.stress = clamp(state.metrics.stress + 4);
  addLine("Einigungsstelle gestartet. Vorbereitung läuft.", "accent");
  logChronicle({ type: "eskalation", text: "Einigungsstelle eingeleitet." });
}

function showSkillsProfile() {
  addLine("Kompetenzprofil:", "accent");
  Object.entries(state.skillsProfile).forEach(([key, value]) => {
    addLine(`- ${key}: ${value}`);
  });
  addLine(`Interpretation: ${generateProfileText()}`);
}

function showChronicle() {
  if (state.chronicle.length === 0) {
    addLine("Die Chronik ist noch leer.");
    return;
  }
  addLine("Deine Amtszeit im Rückblick:", "accent");
  state.chronicle.slice(-15).forEach((entry) => {
    addLine(`Tag ${entry.day} · Slot ${entry.slot}: ${entry.text}`);
  });
}

function finishSimulation() {
  addLine("Simulation beendet. Auswertung folgt...", "accent");
  addLine("Amtszeit-Auswertung:", "accent");
  addBlock(generateTenureSummary());
  addLine("Kompetenzprofil:", "accent");
  addLine(generateProfileText());
  addLine("Chronik-Zusammenfassung:", "accent");
  addBlock(generateChronicleSummary());
  addLine("Reflexionsfragen:", "accent");
  reflectionQuestions.forEach((question, index) => {
    addLine(`${index + 1}) ${question}`);
  });
  addLine("Antworte mit 'antwort <nummer> <text>'.", "warning");
  addBlock(generateClosingMessage(), "accent");
  showGuidedActions("abschluss");
}

function generateTenureSummary() {
  const { trustEmployees, trustEmployer, teamCohesion, legalRisk, stress, workload } =
    state.metrics;
  return [
    `Vertrauen Mitarbeitende: ${trustEmployees}/100`,
    `Vertrauen Arbeitgeber: ${trustEmployer}/100`,
    `Teamkohäsion: ${teamCohesion}/100`,
    `Rechtsrisiko: ${legalRisk}/100`,
    `Stresslevel: ${stress}/100`,
    `Arbeitsbelastung: ${workload}/100`,
    `Fallakten: ${state.caseFiles.length} · Notizen: ${state.notes.length}`,
    `Eskalationsbilanz: ${state.escalationLevel}`,
  ];
}

function generateProfileText() {
  const profile = state.skillsProfile;
  const parts = [];
  if (profile.konfliktstil > 15) parts.push("konfrontativ");
  if (profile.konfliktstil < -15) parts.push("vermeidend");
  if (profile.strukturgrad > 15) parts.push("formell");
  if (profile.strukturgrad < -15) parts.push("chaotisch");
  if (profile.schutzfokus > 15) parts.push("mit starkem Schutzfokus");
  if (profile.eskalationsneigung > 10) parts.push("eskalationsbereit");
  if (profile.belastungsresistenz > 15) parts.push("belastungsresistent");
  if (parts.length === 0) return "Ausgewogen zwischen Verantwortung und Pragmatismus.";
  return `So hast du als BR gehandelt: ${parts.join(", ")}.`;
}

function generateChronicleSummary() {
  if (state.chronicle.length === 0) {
    return ["Keine markanten Ereignisse dokumentiert."];
  }
  const highlights = state.chronicle.slice(-5).map((entry) => `- ${entry.text}`);
  return ["Wendepunkte:", ...highlights];
}

function generateClosingMessage() {
  return [
    "Abschlussnachricht:",
    "Die Simulation ist eine Annäherung an die Realität von Betriebsratsarbeit.",
    "Entscheidungen haben Wirkung, erfordern aber auch Grenzen, Selbstschutz und Zusammenarbeit.",
    "Für echte Situationen sind professionelle Ansprechstellen wichtig.",
  ];
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
