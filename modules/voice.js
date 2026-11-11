export function createVoice() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  return {
    supported: Boolean(Recognition),
    listen(onText, onError) {
      if (!Recognition) {
        onError?.("Spracherkennung ist in diesem Browser nicht verfügbar.");
        return;
      }
      const recognition = new Recognition();
      recognition.lang = "de-DE";
      recognition.interimResults = false;
      recognition.continuous = false;
      recognition.onresult = event => {
        const text = event.results?.[0]?.[0]?.transcript || "";
        if (text) onText?.(text);
      };
      recognition.onerror = event => onError?.("Mikrofon: " + event.error);
      recognition.start();
    },
    speak(text) {
      if (!("speechSynthesis" in window) || !text) return false;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "de-DE";
      utterance.rate = 0.96;
      utterance.pitch = 1.02;
      window.speechSynthesis.speak(utterance);
      return true;
    }
  };
}
