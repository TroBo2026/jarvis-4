const KEY = "jarvis5_memory_v1";

function readAll() {
  try {
    const current = JSON.parse(localStorage.getItem(KEY) || "null");
    if (Array.isArray(current)) return current;
    const legacy = JSON.parse(localStorage.getItem("jarvis40_knowledge_v2") || localStorage.getItem("jarvis40_knowledge_v1") || "[]");
    const projects = JSON.parse(localStorage.getItem("jarvis40_projects_v1") || "[]");
    const migrated = [
      ...(Array.isArray(legacy) ? legacy : []),
      ...(Array.isArray(projects) ? projects.map(item => ({ ...item, category: "Projekt" })) : [])
    ].map((item, index) => ({
      id: String(item.id || "legacy-" + index),
      title: String(item.title || "Importierte Notiz"),
      text: String(item.text || ""),
      category: String(item.category || "Notiz"),
      updatedAt: item.updated || new Date().toISOString()
    })).filter(item => item.title && item.text);
    if (migrated.length) localStorage.setItem(KEY, JSON.stringify(migrated));
    return migrated;
  } catch {
    return [];
  }
}

function writeAll(items) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
    return true;
  } catch {
    return false;
  }
}

export const memory = {
  all() { return readAll(); },
  add({ title, text, category = "Notiz" }) {
    const items = readAll();
    const item = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      title: String(title || "").trim().slice(0, 120),
      text: String(text || "").trim().slice(0, 3000),
      category: String(category || "Notiz").slice(0, 40),
      updatedAt: new Date().toISOString()
    };
    if (!item.title || !item.text) throw new Error("Titel und Inhalt sind erforderlich.");
    items.unshift(item);
    if (!writeAll(items)) throw new Error("Der lokale Speicher ist voll oder nicht verfügbar.");
    return item;
  },
  remove(id) {
    return writeAll(readAll().filter(item => item.id !== id));
  },
  search(query, limit = 5) {
    const terms = String(query || "").toLocaleLowerCase("de").split(/[^\p{L}\p{N}]+/u).filter(Boolean);
    if (!terms.length) return [];
    return readAll().map(item => {
      const title = item.title.toLocaleLowerCase("de");
      const body = item.text.toLocaleLowerCase("de");
      const category = item.category.toLocaleLowerCase("de");
      const score = terms.reduce((total, term) =>
        total + (title === term ? 10 : title.includes(term) ? 6 : 0)
          + (body.includes(term) ? 3 : 0)
          + (category.includes(term) ? 1 : 0), 0);
      return { ...item, score };
    }).filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score || b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, limit)
      .map(({ id, title, text, category }) => ({ id, title, text, category }));
  }
};
