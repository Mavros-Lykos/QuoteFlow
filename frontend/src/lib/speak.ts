import { API_BASE } from './platform';

/** Read text aloud: cloud voice when available, otherwise the device voice. */
export async function speak(text: string, onEnd: () => void): Promise<void> {
  try {
    const fd = new FormData();
    fd.append('text', text);
    const res = await fetch(`${API_BASE}/voice/readout`, { method: 'POST', body: fd });
    if (res.ok) {
      const audio = new Audio(URL.createObjectURL(await res.blob()));
      audio.onended = onEnd;
      audio.onerror = onEnd;
      await audio.play();
      return;
    }
  } catch {
    /* fall back to the device voice */
  }
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.onend = onEnd;
    u.onerror = onEnd;
    window.speechSynthesis.speak(u);
  } else {
    onEnd();
  }
}
