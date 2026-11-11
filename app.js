import { memory } from "./core/memory.js";
import { askModel, getWorkerUrl, saveWorkerUrl } from "./core/llm-client.js";
import { createVoice } from "./modules/voice.js";

const $ = id => document.getElementById(id);
const HISTORY_KEY = "jarvis5_chat_v1";
const SETTINGS_KEY = "jarvis5_settings_v1";
const voice = createVoice();
let busy = false;
let history = loadHistory();

function loadHistory() {
  try {
    const current = JSON.parse(localStorage.getItem(HISTORY_KEY) || "null");
    if (Array.isArray(current)) return current;
    const legacy = JSON.parse(localStorage.getItem("jarvis41_chat_history_v1") || "[]");
    const migrated = Array.isArray(legacy) ? legacy.map(item => ({
      role: item.role === "user" ? "user" : "assistant",
      content: String(item.content || item.text || "")
    })).filter(item => item.content) : [];
    if (migrated.length) localStorage.setItem(HISTORY_KEY, JSON.stringify(migrated));
    return migrated;
  } catch { return []; }
}
function saveHistory() {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-80))); } catch {}
}
function settings() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}"); } catch { return {}; }
}
function setStatus(label, detail, state = "idle") {
  $("connectionState").textContent = label;
  $("connectionDetail").textContent = detail;
  $("connectionDot").className = "status-dot " + state;
  if ($("dashboardStatus")) $("dashboardStatus").textContent = label;
  if ($("dashboardDot")) $("dashboardDot").className = "status-dot " + state;
}
function go(view) {
  document.querySelectorAll("[data-view]").forEach(button => button.classList.toggle("active", button.dataset.view === view));
  document.querySelectorAll(".page").forEach(page => page.hidden = page.id !== "page-" + view);
  $("pageHeading").textContent = ({chat:"Gespräch",dashboard:"Systemübersicht",memory:"Gedächtnis",settings:"Einstellungen"})[view] || "JARVIS";
  if (view === "memory") renderMemory();
  if (view === "dashboard") renderDashboard();
}
function addBubble(role, text) {
  const node = document.createElement("article");
  node.className = "bubble " + role;
  const who = document.createElement("span");
  who.className = "bubble-role";
  who.textContent = role === "user" ? "SIR" : "JARVIS";
  const body = document.createElement("p");
  body.textContent = text;
  node.append(who, body);
  $("messages").append(node);
  $("messages").scrollTop = $("messages").scrollHeight;
  return body;
}
function renderHistory() {
  $("messages").replaceChildren();
  if (!history.length) {
    addBubble("assistant", "Guten Tag, Sir. JARVIS 5.0 ist bereit. Die Verbindung zum Sprachmodell wird erst bei Ihrer ersten Nachricht verwendet.");
    return;
  }
  history.forEach(item => addBubble(item.role, item.content));
}
function renderMemory() {
  const items = memory.all();
  $("memoryCount").textContent = items.length;
  $("memoryList").replaceChildren();
  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Das Gedächtnis ist noch leer. Fügen Sie Informationen hinzu, die JARVIS später als Kontext verwenden darf.";
    $("memoryList").append(empty);
    return;
  }
  items.forEach(item => {
    const card = document.createElement("article");
    card.className = "memory-card";
    const title = document.createElement("h3");
    title.textContent = item.title;
    const category = document.createElement("span");
    category.className = "tag";
    category.textContent = item.category;
    const body = document.createElement("p");
    body.textContent = item.text;
    const remove = document.createElement("button");
    remove.className = "quiet-button danger";
    remove.textContent = "Eintrag löschen";
    remove.addEventListener("click", () => {
      if (confirm("Diesen Gedächtniseintrag wirklich löschen?")) {
        memory.remove(item.id);
        renderMemory();
        renderDashboard();
      }
    });
    card.append(title, category, body, remove);
    $("memoryList").append(card);
  });
}
function renderDashboard() {
  $("dashboardMemoryCount").textContent = memory.all().length;
  $("dashboardMessageCount").textContent = history.filter(x => x.role === "user").length;
  $("workerAddress").textContent = getWorkerUrl();
}
function setBusy(value) {
  busy = value;
  $("sendButton").disabled = value;
  $("messageInput").disabled = value;
  $("sendButton").textContent = value ? "…" : "↑";
  if (value) setStatus("Verarbeite Anfrage", "JARVIS sendet die Nachricht an den konfigurierten Cloudflare Worker.", "working");
}
async function sendMessage(text) {
  const prompt = String(text || "").trim();
  if (!prompt || busy) return;
  history.push({ role: "user", content: prompt });
  addBubble("user", prompt);
  $("messageInput").value = "";
  saveHistory();
  setBusy(true);
  const responseBubble = addBubble("assistant", "JARVIS verarbeitet Ihre Anfrage …");
  try {
    const relevant = memory.search(prompt, 5);
    const modelMessages = history.slice(-8).map(item => ({
      role: item.role,
      content: String(item.content).slice(0, 2000)
    }));
    const reply = await askModel({ messages: modelMessages, memories: relevant });
    responseBubble.textContent = reply;
    history.push({ role: "assistant", content: reply });
    saveHistory();
    setStatus("Sprachmodell erreichbar", "Antwort erfolgreich über Cloudflare Workers AI empfangen.", "online");
  } catch (error) {
    responseBubble.textContent = "Die KI-Anfrage ist fehlgeschlagen. " + error.message;
    setStatus("Verbindung fehlgeschlagen", error.message, "error");
  } finally {
    setBusy(false);
    $("messageInput").focus();
  }
}
$("chatForm").addEventListener("submit", event => {
  event.preventDefault();
  sendMessage($("messageInput").value);
});
$("newChat").addEventListener("click", () => {
  if (busy) return;
  history = [];
  saveHistory();
  renderHistory();
  go("chat");
});
document.querySelectorAll("[data-view]").forEach(button => button.addEventListener("click", () => go(button.dataset.view)));
document.querySelectorAll("[data-open]").forEach(button => button.addEventListener("click", () => go(button.dataset.open)));
$("memoryForm").addEventListener("submit", event => {
  event.preventDefault();
  try {
    memory.add({ title: $("memoryTitle").value, text: $("memoryText").value, category: $("memoryCategory").value });
    $("memoryForm").reset();
    renderMemory();
    renderDashboard();
  } catch (error) { $("memoryFeedback").textContent = error.message; }
});
$("saveSettings").addEventListener("click", () => {
  try {
    const url = saveWorkerUrl($("workerUrl").value);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ savedAt: new Date().toISOString() }));
    $("workerUrl").value = url;
    $("settingsFeedback").textContent = "Einstellungen lokal gespeichert.";
    setStatus("Bereit", "Worker-Adresse gespeichert. Eine echte Modellanfrage wird beim Senden geprüft.");
    renderDashboard();
  } catch (error) { $("settingsFeedback").textContent = error.message; }
});
$("testConnection").addEventListener("click", () => {
  go("chat");
  sendMessage("Antworte bitte nur mit: JARVIS-Verbindung erfolgreich.");
});
$("micButton").addEventListener("click", () => {
  voice.listen(text => { $("messageInput").value = ($("messageInput").value + " " + text).trim(); $("messageInput").focus(); },
    message => setStatus("Mikrofon nicht verfügbar", message, "error"));
});
$("speakButton").addEventListener("click", () => {
  const last = [...history].reverse().find(item => item.role === "assistant");
  if (!last || !voice.speak(last.content)) setStatus("Sprachausgabe nicht verfügbar", "Dieser Browser unterstützt keine Sprachausgabe.", "error");
});
$("clearHistory").addEventListener("click", () => {
  if (!confirm("Den lokalen Chatverlauf wirklich löschen?")) return;
  history = [];
  saveHistory();
  renderHistory();
});
$("workerUrl").value = getWorkerUrl();
const saved = settings();
renderHistory();
renderMemory();
renderDashboard();
setStatus("Bereit", "Noch keine neue Modellanfrage in dieser Sitzung.", "idle");
