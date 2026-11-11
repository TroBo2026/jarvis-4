const DEFAULT_WORKER = "https://jarvisia.carlhorn25.workers.dev";

export function getWorkerUrl() {
  try {
    return (localStorage.getItem("jarvis5_worker_url") || DEFAULT_WORKER).replace(/\/$/, "");
  } catch {
    return DEFAULT_WORKER;
  }
}

export function saveWorkerUrl(value) {
  const url = String(value || "").trim().replace(/\/$/, "");
  if (!/^https:\/\//i.test(url)) throw new Error("Bitte eine gültige HTTPS-Adresse eintragen.");
  localStorage.setItem("jarvis5_worker_url", url);
  return url;
}

/*
 * Uses the existing JARVIS Worker contract: POST /chat with messages + memories.
 * The browser never receives a Cloudflare API token. The Worker owns model selection.
 */
export async function askModel({ messages, memories = [] }) {
  const endpoint = getWorkerUrl() + "/chat";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, memories }),
      signal: controller.signal
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "Worker antwortete mit HTTP " + response.status + ".");
    }
    if (typeof data.reply !== "string" || !data.reply.trim()) {
      throw new Error("Der Worker hat keine gültige Textantwort geliefert.");
    }
    return data.reply.trim();
  } catch (error) {
    if (error.name === "AbortError") throw new Error("Zeitüberschreitung: Das Modell hat nicht rechtzeitig geantwortet.");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
