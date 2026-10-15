import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Mic, Square, Sparkles } from 'lucide-react';
import { useApp } from '../lib/app-context';
import { TRADES } from '../lib/countries';
import { initials } from '../lib/format';
import { API_BASE } from '../lib/platform';
import { useVoiceNote } from '../lib/useVoiceNote';
import { Button, Field, useToast } from '../components/ui';

const SAMPLE_NOTES =
  'Replace the 50-gallon electric water heater in the basement with a tankless gas unit. Upsize the gas line to 3/4 inch, run a new vent through the side wall, and include the permit and haul-away of the old tank.';

const STEP_LABELS = ['The job', 'The customer', 'Review'];
const BUSY_STEPS = ['Reading your notes', 'Checking similar past jobs', 'Looking up local labor rates', 'Writing the estimate'];

const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export const NewEstimate: React.FC = () => {
  const { profile, prefs, clients, generate, addClient } = useApp();
  const toast = useToast();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const isSample = params.get('sample') === '1';

  const [step, setStep] = useState(0);
  const [trade, setTrade] = useState(profile.default_trade || 'Plumbing');
  const [notes, setNotes] = useState(isSample ? SAMPLE_NOTES : '');
  const [clientId, setClientId] = useState<string | null>(null);
  const [name, setName] = useState(isSample ? 'Sample customer' : '');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [zip, setZip] = useState('');
  const [margin, setMargin] = useState(() => Math.min(55, Math.max(15, Math.round(profile.default_markup_percent || 30))));
  const [busy, setBusy] = useState(false);
  const [busyStep, setBusyStep] = useState(0);

  const voice = useVoiceNote(setNotes, () => API_BASE);
  const startedRef = useRef(false);

  useEffect(() => {
    const cid = params.get('client');
    if (cid) {
      const c = clients.find((x) => x.id === cid);
      if (c) {
        setClientId(c.id);
        setName(c.name);
        setPhone(c.phone);
        setEmail(c.email);
        setAddress(c.address);
        setZip(c.zip_code);
      }
    }
    if (params.get('voice') === '1' && !startedRef.current) {
      startedRef.current = true;
      voice.toggle();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!busy) return;
    setBusyStep(0);
    const ids = [700, 1500, 2400].map((ms, i) => window.setTimeout(() => setBusyStep(i + 1), ms));
    return () => ids.forEach(window.clearTimeout);
  }, [busy]);

  const pickClient = (id: string) => {
    const c = clients.find((x) => x.id === id);
    if (!c) return;
    setClientId(id);
    setName(c.name);
    setPhone(c.phone);
    setEmail(c.email);
    setAddress(c.address);
    setZip(c.zip_code);
  };

  const zipLabel = prefs.country === 'US' ? 'ZIP code' : 'Postal code';
  const canNext = step === 0 ? notes.trim().length >= 10 : step === 1 ? name.trim().length > 0 : true;

  const submit = async () => {
    setBusy(true);
    try {
      const client = { name: name.trim(), phone: phone.trim(), email: email.trim(), address: address.trim(), zip_code: zip.trim() };
      const quote = await generate({ prompt: notes.trim(), trade_type: trade, client_info: client, target_margin_percent: margin });
      if (!isSample) addClient(client);
      toast('success', 'Estimate ready');
      nav(`/app/estimates/${quote.id}`, { replace: true });
    } catch (e) {
      setBusy(false);
      toast('error', e instanceof Error && e.message ? `Couldn’t create the estimate: ${e.message}` : 'Couldn’t create the estimate. Check your connection and try again.');
    }
  };

  const recording = voice.state === 'recording';
  const transcribing = voice.state === 'transcribing';

  return (
    <div className="page page--center">
      <ol className="wiz-steps" aria-label="Progress">
        {STEP_LABELS.map((l, i) => (
          <li key={l} className={`wiz-step ${i < step ? 'is-done' : ''} ${i === step ? 'is-current' : ''}`} aria-current={i === step ? 'step' : undefined}>
            <i />
            {l}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <section className="rise">
          <h1 className="wiz-title">Describe the job</h1>
          <p className="wiz-sub">Say what you’d tell a coworker: the work, the materials, anything tricky.</p>

          <div className="mic-stage">
            <button
              type="button"
              className={`mic ${recording ? 'is-rec' : ''}`}
              onClick={voice.toggle}
              disabled={transcribing || !voice.supported}
              aria-label={recording ? 'Stop recording' : 'Start voice note'}
            >
              {recording ? <Square size={30} fill="currentColor" aria-hidden /> : <Mic size={36} aria-hidden />}
            </button>
            {recording ? (
              <>
                <div className="wave" aria-hidden>
                  {voice.bars.map((b, i) => (
                    <span key={i} style={{ height: `${Math.round(b * 100)}%` }} />
                  ))}
                </div>
                <div className="mic-time" role="timer">{fmtTime(voice.seconds)}</div>
              </>
            ) : (
              <div className="mic-label">{transcribing ? 'Working on it…' : 'Tap and talk'}</div>
            )}
            <p className="mic-hint" role="status">
              {voice.message || (voice.supported ? 'Your voice is turned into text you can edit.' : 'Voice isn’t available in this browser. Type below.')}
            </p>
          </div>

          <div className="or-line">or type it</div>

          <div style={{ display: 'grid', gap: 18 }}>
            <Field label="Job notes" htmlFor="notes">
              <textarea
                id="notes"
                className="textarea"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Example: Replace the water heater in the basement. Tankless unit, upsize gas line, permit and haul-away."
              />
            </Field>
            <Field label="Trade" htmlFor="trade">
              <select id="trade" className="select" value={trade} onChange={(e) => setTrade(e.target.value)}>
                {TRADES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
            {notes.trim().length === 0 && (
              <button type="button" className="link" style={{ justifySelf: 'start' }} onClick={() => { setNotes(SAMPLE_NOTES); setName((n) => n || 'Sample customer'); }}>
                Try an example job
              </button>
            )}
          </div>
        </section>
      )}

      {step === 1 && (
        <section className="rise">
          <h1 className="wiz-title">Who is this for?</h1>
          <p className="wiz-sub">Their name goes on the estimate. The rest helps with local pricing and follow-up.</p>

          {clients.length > 0 && (
            <>
              <div className="field__label" style={{ marginBottom: 10 }}>Saved customers</div>
              <div className="client-picks">
                {clients.slice(0, 12).map((c) => (
                  <button key={c.id} type="button" className={`client-pick ${clientId === c.id ? 'is-active' : ''}`} onClick={() => pickClient(c.id)}>
                    <span className="row__avatar" aria-hidden>{initials(c.name)}</span>
                    {c.name}
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="form-grid">
            <div className="span-2">
              <Field label="Customer name" htmlFor="cname">
                <input id="cname" className="input" value={name} autoFocus onChange={(e) => { setName(e.target.value); setClientId(null); }} autoComplete="off" />
              </Field>
            </div>
            <Field label="Phone" htmlFor="cphone" optional>
              <input id="cphone" className="input" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="off" />
            </Field>
            <Field label="Email" htmlFor="cemail" optional>
              <input id="cemail" className="input" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
            </Field>
            <div className="span-2">
              <Field label="Job address" htmlFor="caddr" optional>
                <input id="caddr" className="input" value={address} onChange={(e) => setAddress(e.target.value)} autoComplete="off" />
              </Field>
            </div>
            <Field label={zipLabel} htmlFor="czip" optional hint="Used to look up local labor rates.">
              <input id="czip" className="input" value={zip} onChange={(e) => setZip(e.target.value)} autoComplete="off" />
            </Field>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="rise">
          <h1 className="wiz-title">Ready to create it</h1>
          <p className="wiz-sub">Check the details, set your margin, and we’ll do the rest.</p>

          <div className="card card--pad">
            <dl className="recap">
              <div>
                <dt>Customer</dt>
                <dd>{name}</dd>
              </div>
              <div>
                <dt>Trade</dt>
                <dd>{trade}</dd>
              </div>
              <div style={{ flexDirection: 'column', gap: 6 }}>
                <dt>Job</dt>
                <dd className="notes">{notes}</dd>
              </div>
            </dl>
          </div>

          <div className="card card--pad" style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <label htmlFor="margin" className="field__label">Your margin</label>
              <b className="num" style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem' }}>{margin}%</b>
            </div>
            <input id="margin" type="range" min={15} max={55} value={margin} onChange={(e) => setMargin(Number(e.target.value))} />
            <p className="field__hint">Higher margin means a higher price. Most trades work at 25 to 35%.</p>
          </div>

          <p className="muted" style={{ marginTop: 16, fontSize: '0.875rem' }}>
            {prefs.ai_mode === 'local' ? 'Created on this computer. Nothing is sent online.' : 'Created online with customer details removed.'}{' '}
            <Link to="/app/settings/ai" className="link">Change</Link>
          </p>
        </section>
      )}

      <div className="wiz-nav">
        {step > 0 ? (
          <Button variant="secondary" size="lg" onClick={() => setStep(step - 1)}>
            <ArrowLeft size={18} aria-hidden /> Back
          </Button>
        ) : (
          <span />
        )}
        {step < 2 ? (
          <Button variant="primary" size="lg" disabled={!canNext || recording || transcribing} onClick={() => setStep(step + 1)}>
            Continue <ArrowRight size={18} aria-hidden />
          </Button>
        ) : (
          <Button variant="primary" size="lg" onClick={() => void submit()}>
            <Sparkles size={18} aria-hidden /> Create estimate
          </Button>
        )}
      </div>

      {busy && (
        <div className="busy" role="alertdialog" aria-live="polite" aria-label="Creating your estimate">
          <div className="busy__card">
            <div className="busy__spinner" aria-hidden />
            <h2>Creating your estimate</h2>
            <ul>
              {BUSY_STEPS.map((s, i) => (
                <li key={s} className={busyStep > i ? 'is-done' : ''}>
                  {busyStep > i ? <Check size={18} aria-hidden /> : <span className="ph" aria-hidden />}
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
