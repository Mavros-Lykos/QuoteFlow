import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, Loader2, X } from 'lucide-react';
import { useApp } from '../lib/app-context';
import {
  closeDesktopApp,
  ensureAi,
  getAiStatus,
  getUseOnlineMode,
  onAiPullProgress,
  OLLAMA_INSTALL_URL,
  setUseOnlineMode,
  waitForBackend,
  type AiStatus,
} from '../lib/desktop';
import { Button } from '../components/ui';

type StepId = 'server' | 'ai' | 'model' | 'ready';

const STEPS: { id: StepId; label: string }[] = [
  { id: 'server', label: 'Starting QuoteFlow server' },
  { id: 'ai', label: 'Checking AI' },
  { id: 'model', label: 'Downloading model' },
  { id: 'ready', label: 'Ready' },
];

function stepIndex(id: StepId): number {
  return STEPS.findIndex((s) => s.id === id);
}

export const Preparing: React.FC = () => {
  const nav = useNavigate();
  const { setPrefs } = useApp();
  const [active, setActive] = useState<StepId>('server');
  const [error, setError] = useState<string | null>(null);
  const [pullLine, setPullLine] = useState<string | null>(null);
  const [pullPct, setPullPct] = useState<number | null>(null);
  const [aiInfo, setAiInfo] = useState<AiStatus | null>(null);
  const cancelled = useRef(false);

  const finish = useCallback(
    (online: boolean) => {
      setActive('ready');
      setPrefs({
        ai_ready: true,
        ai_mode: online ? 'standard' : 'local',
      });
      window.setTimeout(() => nav('/app/welcome', { replace: true }), 400);
    },
    [nav, setPrefs]
  );

  const useOnline = useCallback(async () => {
    await setUseOnlineMode(true);
    finish(true);
  }, [finish]);

  useEffect(() => {
    cancelled.current = false;
    let unlisten: (() => void) | undefined;

    void (async () => {
      unlisten = await onAiPullProgress((p) => {
        setPullLine(p.message);
        if (p.percent != null) setPullPct(p.percent);
      });

      const alreadyOnline = await getUseOnlineMode();
      if (alreadyOnline) {
        finish(true);
        return;
      }

      setActive('server');
      const up = await waitForBackend();
      if (cancelled.current) return;
      if (!up) {
        setError('QuoteFlow server did not start. Check that Python is installed and port 8000 is free.');
        return;
      }

      setActive('ai');
      const status = await getAiStatus();
      setAiInfo(status);
      if (cancelled.current) return;

      if (!status?.ollama_on_path) {
        setError('install_ollama');
        return;
      }

      if (status.has_gemma3_4b) {
        finish(false);
        return;
      }

      setActive('model');
      const result = await ensureAi();
      if (cancelled.current) return;
      if (!result.ok) {
        setError(result.error || 'Could not prepare local AI.');
        return;
      }
      finish(false);
    })();

    return () => {
      cancelled.current = true;
      unlisten?.();
    };
  }, [finish]);

  const idx = stepIndex(active);

  return (
    <div className="prep">
      <div className="prep__card">
        <div className="prep__head">
          <div className="nav__mark" aria-hidden>
            Q
          </div>
          <div>
            <h1 className="prep__title">Preparing QuoteFlow</h1>
            <p className="prep__sub">One-time setup for local estimates and on-device AI.</p>
          </div>
        </div>

        <ol className="prep__steps">
          {STEPS.map((s, i) => {
            const done = i < idx || active === 'ready';
            const current = i === idx && active !== 'ready';
            return (
              <li key={s.id} className={`prep__step ${done ? 'is-done' : ''} ${current ? 'is-active' : ''}`}>
                <span className="prep__step-icon" aria-hidden>
                  {done ? '✓' : current ? <Loader2 size={18} className="spin" /> : i + 1}
                </span>
                <span>{s.label}</span>
              </li>
            );
          })}
        </ol>

        {pullLine && active === 'model' && (
          <p className="prep__pull" role="status">
            {pullLine}
            {pullPct != null ? ` (${Math.round(pullPct)}%)` : ''}
          </p>
        )}

        {error === 'install_ollama' && (
          <div className="prep__err" role="alert">
            <p>
              Ollama was not found on this PC. Install it to run <strong>gemma3:4b</strong> locally, or use online
              mode (Groq) instead.
            </p>
            <a href={OLLAMA_INSTALL_URL} target="_blank" rel="noopener noreferrer" className="prep__link">
              Install Ollama <ExternalLink size={16} aria-hidden />
            </a>
          </div>
        )}

        {error && error !== 'install_ollama' && (
          <div className="prep__err" role="alert">
            <p>{error}</p>
          </div>
        )}

        {aiInfo && !aiInfo.ollama_on_path && error !== 'install_ollama' && (
          <p className="prep__hint">Ollama: not on PATH</p>
        )}

        <div className="prep__actions">
          <Button type="button" variant="secondary" onClick={() => void closeDesktopApp()}>
            <X size={18} aria-hidden /> Cancel
          </Button>
          <Button type="button" variant="primary" onClick={() => void useOnline()}>
            Use online mode instead
          </Button>
        </div>
      </div>
    </div>
  );
};
