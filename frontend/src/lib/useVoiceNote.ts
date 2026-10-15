import { useCallback, useEffect, useRef, useState } from 'react';
import { API_BASE } from './platform';

export type VoiceState = 'idle' | 'recording' | 'transcribing';

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

const BAR_COUNT = 24;

/**
 * Voice-first job notes.
 * - Live transcript from the browser while recording (when supported).
 * - Cloud transcription (ElevenLabs via the API) replaces it on stop if available.
 * - If both fail, we keep whatever the live transcript captured and say so plainly.
 */
export function useVoiceNote(onText: (text: string) => void, getBase: () => string) {
  const [state, setState] = useState<VoiceState>('idle');
  const [seconds, setSeconds] = useState(0);
  const [message, setMessage] = useState('');
  const [bars, setBars] = useState<number[]>(() => Array(BAR_COUNT).fill(0.08));

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recogRef = useRef<SpeechRecognitionLike | null>(null);
  const liveTextRef = useRef('');
  const timerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);

  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
  const supported = Boolean(navigator.mediaDevices?.getUserMedia) || Boolean(SR);

  const cleanup = useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    timerRef.current = null;
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    ctxRef.current?.close().catch(() => undefined);
    ctxRef.current = null;
    setBars(Array(BAR_COUNT).fill(0.08));
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const startLevels = (stream: MediaStream) => {
    try {
      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      src.connect(analyser);
      ctxRef.current = ctx;
      const data = new Uint8Array(analyser.frequencyBinCount);
      let last = 0;
      const tick = (t: number) => {
        rafRef.current = requestAnimationFrame(tick);
        if (t - last < 70) return;
        last = t;
        analyser.getByteFrequencyData(data);
        const next: number[] = [];
        for (let i = 0; i < BAR_COUNT; i++) {
          const v = data[Math.floor((i / BAR_COUNT) * data.length)] / 255;
          next.push(Math.max(0.08, Math.min(1, v * 1.4)));
        }
        setBars(next);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      /* levels are decorative */
    }
  };

  const startLive = () => {
    if (!SR) return;
    try {
      const r = new SR();
      r.continuous = true;
      r.interimResults = true;
      r.lang = navigator.language || 'en-US';
      r.onresult = (e) => {
        let text = '';
        for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript + ' ';
        liveTextRef.current = text.trim();
        onText(liveTextRef.current);
      };
      r.onerror = () => undefined;
      r.onend = () => undefined;
      recogRef.current = r;
      r.start();
    } catch {
      recogRef.current = null;
    }
  };

  const transcribeCloud = async (blob: Blob): Promise<string> => {
    const fd = new FormData();
    fd.append('file', blob, 'job-note.webm');
    const res = await fetch(`${getBase() || API_BASE}/voice/transcribe`, { method: 'POST', body: fd });
    if (!res.ok) throw new Error('transcribe failed');
    const data = await res.json();
    return String(data.transcript || '').trim();
  };

  const stop = useCallback(() => {
    try {
      recogRef.current?.stop();
    } catch {
      /* ignore */
    }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    } else {
      cleanup();
      setState('idle');
    }
  }, [cleanup]);

  const start = useCallback(async () => {
    liveTextRef.current = '';
    chunksRef.current = [];
    setSeconds(0);
    setMessage('');

    if (!navigator.mediaDevices?.getUserMedia) {
      if (!SR) {
        setMessage('Voice is not available here. You can type the job instead.');
        return;
      }
      startLive();
      setState('recording');
      setMessage('Listening…');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const rec = new MediaRecorder(stream);
      recorderRef.current = rec;
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = async () => {
        cleanup();
        const hadLive = liveTextRef.current.length > 0;
        setState('transcribing');
        setMessage('Cleaning up your note…');
        try {
          const text = await transcribeCloud(new Blob(chunksRef.current, { type: 'audio/webm' }));
          if (text) {
            onText(text);
            setMessage('Added from your voice note.');
            setState('idle');
            return;
          }
        } catch {
          /* fall through to live text */
        }
        setMessage(hadLive ? 'Added from your voice note.' : 'We could not hear anything. Try again or type it.');
        setState('idle');
      };
      rec.start();
      startLevels(stream);
      startLive();
      setState('recording');
      setMessage('Listening… tap to finish.');
      timerRef.current = window.setInterval(() => {
        setSeconds((s) => {
          if (s >= 119) {
            stop();
            return s;
          }
          return s + 1;
        });
      }, 1000);
    } catch {
      cleanup();
      setState('idle');
      setMessage('Microphone access is blocked. Allow it in your browser settings, or type the job instead.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleanup, stop]);

  const toggle = useCallback(() => {
    if (state === 'recording') stop();
    else if (state === 'idle') void start();
  }, [state, start, stop]);

  return { state, seconds, message, bars, supported, toggle };
}
