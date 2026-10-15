import React, { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Briefcase, ChevronRight, Cpu, Download, Globe, Info, Lock, Palette, Percent, ShieldCheck, Trash2,
} from 'lucide-react';
import { useApp } from '../lib/app-context';
import { COUNTRIES, TRADES, findCountry } from '../lib/countries';
import { openReleases } from '../lib/desktop';
import { API_BASE, isDesktop } from '../lib/platform';
import type { ContractorProfile, ThemePref } from '../types';
import { Button, Field, PageHeader, Segmented, Sheet, useToast } from '../components/ui';

const SECTIONS = [
  { id: 'business', title: 'Business', sub: 'Name, contact, license', icon: Briefcase, group: 'Your business' },
  { id: 'pricing', title: 'Pricing and tax', sub: 'Rates, markup, payment terms', icon: Percent, group: 'Your business' },
  { id: 'region', title: 'Region and currency', sub: 'Country, currency, tax name', icon: Globe, group: 'Your business' },
  { id: 'ai', title: 'AI and voice', sub: 'Where estimates are written', icon: Cpu, group: 'App' },
  { id: 'appearance', title: 'Appearance', sub: 'Light or dark', icon: Palette, group: 'App' },
  { id: 'privacy', title: 'Privacy and data', sub: 'What stays on this device', icon: Lock, group: 'App' },
  { id: 'about', title: 'About', sub: 'Version and updates', icon: Info, group: 'App' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

const SettingsIndex: React.FC = () => {
  const nav = useNavigate();
  const groups = ['Your business', 'App'] as const;
  return (
    <div className="page">
      <PageHeader title="Settings" />
      <div style={{ maxWidth: 640 }}>
        {groups.map((g) => (
          <React.Fragment key={g}>
            <div className="settings-group">{g}</div>
            <div className="card rows settings-list">
              {SECTIONS.filter((s) => s.group === g).map((s) => (
                <button key={s.id} type="button" className="row" onClick={() => nav(`/app/settings/${s.id}`)}>
                  <span className="row__icon"><s.icon size={20} aria-hidden /></span>
                  <span className="row__main">
                    <span className="row__title">{s.title}</span>
                    <span className="row__sub" style={{ display: 'block' }}>{s.sub}</span>
                  </span>
                  <ChevronRight size={18} className="row__chev" aria-hidden />
                </button>
              ))}
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

/* ---------- Sections ---------- */

const useProfileDraft = () => {
  const { profile, setProfile } = useApp();
  const toast = useToast();
  const [draft, setDraft] = useState<ContractorProfile>(profile);
  const dirty = JSON.stringify(draft) !== JSON.stringify(profile);
  const set = <K extends keyof ContractorProfile>(k: K, v: ContractorProfile[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const save = async () => {
    await setProfile(draft);
    toast('success', 'Saved');
  };
  return { draft, set, dirty, save };
};

const SaveBar: React.FC<{ dirty: boolean; onSave: () => void }> = ({ dirty, onSave }) => (
  <div style={{ marginTop: 24 }}>
    <Button variant="primary" size="lg" disabled={!dirty} onClick={onSave}>
      Save changes
    </Button>
  </div>
);

const BusinessSection: React.FC = () => {
  const { draft, set, dirty, save } = useProfileDraft();
  return (
    <>
      <div className="form-grid">
        <div className="span-2"><Field label="Business name" htmlFor="bn"><input id="bn" className="input" value={draft.business_name} onChange={(e) => set('business_name', e.target.value)} /></Field></div>
        <Field label="Your name" htmlFor="cn" optional><input id="cn" className="input" value={draft.contractor_name} onChange={(e) => set('contractor_name', e.target.value)} /></Field>
        <Field label="Phone" htmlFor="ph" optional><input id="ph" className="input" inputMode="tel" value={draft.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
        <div className="span-2"><Field label="Email" htmlFor="em" optional><input id="em" className="input" inputMode="email" value={draft.email} onChange={(e) => set('email', e.target.value)} /></Field></div>
        <div className="span-2"><Field label="License number" htmlFor="li" optional hint="Shown on every estimate."><input id="li" className="input" value={draft.license_number} onChange={(e) => set('license_number', e.target.value)} /></Field></div>
      </div>
      <SaveBar dirty={dirty} onSave={() => void save()} />
    </>
  );
};

const PricingSection: React.FC = () => {
  const { prefs } = useApp();
  const { draft, set, dirty, save } = useProfileDraft();
  const num = (v: string) => (v === '' ? 0 : Number(v.replace(',', '.')) || 0);
  return (
    <>
      <div className="form-grid">
        <Field label="Hourly labor rate" htmlFor="hr">
          <div className="input-affix">
            <span className="input-affix__pre">{prefs.currency_symbol}</span>
            <input id="hr" className="input num" inputMode="decimal" value={draft.default_hourly_rate} onChange={(e) => set('default_hourly_rate', num(e.target.value))} />
          </div>
        </Field>
        <Field label="Materials markup" htmlFor="mk">
          <div className="input-affix input-affix--post">
            <input id="mk" className="input num" inputMode="decimal" value={draft.default_markup_percent} onChange={(e) => set('default_markup_percent', num(e.target.value))} />
            <span className="input-affix__pre">%</span>
          </div>
        </Field>
        <Field label={`${prefs.tax_label} rate`} htmlFor="tx">
          <div className="input-affix input-affix--post">
            <input id="tx" className="input num" inputMode="decimal" value={draft.default_tax_percent} onChange={(e) => set('default_tax_percent', num(e.target.value))} />
            <span className="input-affix__pre">%</span>
          </div>
        </Field>
        <Field label="Main trade" htmlFor="tr">
          <select id="tr" className="select" value={draft.default_trade} onChange={(e) => set('default_trade', e.target.value)}>
            {TRADES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <div className="span-2">
          <Field label="Payment terms" htmlFor="te" hint="Printed at the bottom of every estimate.">
            <textarea id="te" className="textarea" style={{ minHeight: 110 }} value={draft.terms_template} onChange={(e) => set('terms_template', e.target.value)} />
          </Field>
        </div>
      </div>
      <SaveBar dirty={dirty} onSave={() => void save()} />
    </>
  );
};

const RegionSection: React.FC = () => {
  const { prefs, setCountry } = useApp();
  const toast = useToast();
  const [code, setCode] = useState(prefs.country);
  const c = findCountry(code);
  return (
    <>
      <Field label="Country" htmlFor="co">
        <select id="co" className="select" value={code} onChange={(e) => setCode(e.target.value)}>
          {COUNTRIES.map((x) => <option key={x.code} value={x.code}>{x.name}</option>)}
        </select>
      </Field>
      <div className="region-summary" style={{ marginTop: 16 }}>
        <div>Currency<b>{c.currency} ({c.symbol})</b></div>
        <div>Tax name<b>{c.taxLabel}</b></div>
        <div>Measurements<b>{c.units === 'imperial' ? 'Feet, inches' : 'Metres'}</b></div>
      </div>
      <p className="field__hint" style={{ marginTop: 12 }}>
        Changing region also resets your tax rate and hourly rate to typical values for that country. You can edit them under Pricing and tax. Existing estimates keep their numbers but display in the new currency format.
      </p>
      <div style={{ marginTop: 24 }}>
        <Button variant="primary" size="lg" disabled={code === prefs.country} onClick={() => { setCountry(code); toast('success', 'Region updated'); }}>
          Apply region
        </Button>
      </div>
    </>
  );
};

const AiSection: React.FC = () => {
  const { prefs, setPrefs } = useApp();
  const [ollama, setOllama] = useState<'checking' | 'ready' | 'missing' | 'offline'>('checking');

  useEffect(() => {
    let alive = true;
    fetch(`${API_BASE}/health`)
      .then((r) => r.json())
      .then((d) => alive && setOllama(d.ollama_connected ? 'ready' : 'missing'))
      .catch(() => alive && setOllama('offline'));
    return () => { alive = false; };
  }, []);

  // Web demo is Standard-only; local AI is a desktop feature.
  if (!isDesktop) {
    return (
      <>
        <div className="status-line" role="note">
          <ShieldCheck size={18} aria-hidden />
          <span>
            This is the <b>web demo</b>. Estimates use online mode. Names, phone numbers, and addresses are removed before anything is sent.{' '}
            <Link to="/download">Get the desktop app</Link> for AI that runs on your PC.
          </span>
        </div>
        <div style={{ marginTop: 24 }}>
          <div className="field__label" style={{ marginBottom: 8 }}>Voice notes</div>
          <div className="status-line">
            <ShieldCheck size={18} aria-hidden />
            <span>Tap the microphone when you create an estimate. Your voice is turned into text you can edit before anything is created.</span>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div style={{ display: 'grid', gap: 12 }}>
        <button type="button" className={`choice ${prefs.ai_mode === 'standard' ? 'is-active' : ''}`} onClick={() => setPrefs({ ai_mode: 'standard' })} aria-pressed={prefs.ai_mode === 'standard'}>
          <span className="radio" />
          <span>
            <b>Online <span className="choice-tag">Works everywhere</span></b>
            <p>Fast, and nothing to install. Customer names, phone numbers and addresses are removed before the job is sent.</p>
          </span>
        </button>
        <button type="button" className={`choice ${prefs.ai_mode === 'local' ? 'is-active' : ''}`} onClick={() => setPrefs({ ai_mode: 'local' })} aria-pressed={prefs.ai_mode === 'local'}>
          <span className="radio" />
          <span>
            <b>On this computer</b>
            <p>Nothing leaves your PC. Needs a computer with 8 GB of memory or more.</p>
          </span>
        </button>
      </div>

      {prefs.ai_mode === 'local' && (
        <div className="status-line" style={{ marginTop: 16 }} role="status">
          <i className={`dot ${ollama === 'ready' ? '' : 'dot--off'}`} />
          <span>
            {ollama === 'checking' && 'Checking…'}
            {ollama === 'ready' && 'Ready. The AI is running on this computer.'}
            {ollama === 'missing' && 'Not ready yet. Re-open QuoteFlow or choose Online mode.'}
            {ollama === 'offline' && 'Can’t reach the QuoteFlow server.'}
          </span>
        </div>
      )}

      <div style={{ marginTop: 24 }}>
        <div className="field__label" style={{ marginBottom: 8 }}>Voice notes</div>
        <div className="status-line">
          <ShieldCheck size={18} aria-hidden />
          <span>Tap the microphone when you create an estimate. Your voice is turned into text you can edit before anything is created.</span>
        </div>
      </div>

      <details className="adv" style={{ marginTop: 24 }}>
        <summary>Advanced</summary>
        <div>
          <Field label="Your own Groq API key" htmlFor="gk" optional hint="Only if you want to use your own account for online mode. Stored on this device.">
            <input id="gk" className="input" type="password" autoComplete="off" value={prefs.groq_key} onChange={(e) => setPrefs({ groq_key: e.target.value })} />
          </Field>
        </div>
      </details>
    </>
  );
};

const AboutSection: React.FC = () => (
  <>
    <p style={{ marginBottom: 8 }}><b>QuoteFlow</b> version 0.1.0</p>
    <p className="muted" style={{ marginBottom: 20 }}>
      {isDesktop
        ? 'Windows desktop app. Estimates and customers stay on this PC.'
        : 'Web demo. Download the Windows app for local AI and private storage.'}
    </p>
    {!isDesktop && (
      <p className="muted" style={{ marginBottom: 20 }}>
        Windows SmartScreen may warn on unsigned installers — that is expected until code signing is set up. Prefer the official Download page.
      </p>
    )}
    <Button variant="secondary" onClick={() => void openReleases()}>
      <Download size={18} aria-hidden /> Check for updates
    </Button>
  </>
);

const AppearanceSection: React.FC = () => {
  const { prefs, setPrefs } = useApp();
  return (
    <>
      <div className="field__label" style={{ marginBottom: 10 }}>Theme</div>
      <Segmented<ThemePref>
        label="Theme"
        value={prefs.theme}
        onChange={(v) => setPrefs({ theme: v })}
        options={[
          { value: 'system', label: 'Match device' },
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' },
        ]}
      />
      <p className="field__hint" style={{ marginTop: 12 }}>Dark mode is easier on the eyes in a truck at night.</p>
    </>
  );
};

const PrivacySection: React.FC = () => {
  const { exportAll, wipeDevice, prefs } = useApp();
  const [confirm, setConfirm] = useState(false);
  const download = () => {
    const blob = new Blob([exportAll()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `quoteflow-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <>
      <ul className="privacy-list">
        <li><ShieldCheck size={20} aria-hidden /><span><b>Your business details and customers</b> are saved on this device only.</span></li>
        <li><ShieldCheck size={20} aria-hidden /><span><b>Estimates</b> are stored by the QuoteFlow server {isDesktop ? 'running on this computer' : 'for this web demo'}.</span></li>
        <li><ShieldCheck size={20} aria-hidden /><span><b>{prefs.ai_mode === 'local' ? 'Job notes stay on this computer.' : 'Online mode sends the job notes only,'}</b>{prefs.ai_mode === 'local' ? '' : ' with names, phone numbers and addresses removed.'}</span></li>
      </ul>
      <hr className="divider" />
      <div style={{ display: 'grid', gap: 12 }}>
        <Button variant="secondary" onClick={download}><Download size={18} aria-hidden /> Download a backup</Button>
        <Button variant="danger" onClick={() => setConfirm(true)}><Trash2 size={18} aria-hidden /> Reset this device</Button>
      </div>
      <Sheet
        open={confirm}
        title="Reset this device?"
        onClose={() => setConfirm(false)}
        footer={<><Button variant="ghost" onClick={() => setConfirm(false)}>Cancel</Button><Button variant="danger" onClick={wipeDevice}>Reset</Button></>}
      >
        <p className="muted">This clears your business details, customers and settings from this device and takes you back to setup. Download a backup first if you want to keep them.</p>
      </Sheet>
    </>
  );
};

const BODY: Record<SectionId, React.FC> = {
  business: BusinessSection,
  pricing: PricingSection,
  region: RegionSection,
  ai: AiSection,
  appearance: AppearanceSection,
  privacy: PrivacySection,
  about: AboutSection,
};

export const Settings: React.FC = () => {
  const { section } = useParams();
  if (!section) return <SettingsIndex />;
  const meta = SECTIONS.find((s) => s.id === section);
  if (!meta) return <Navigate to="/app/settings" replace />;
  const Body = BODY[meta.id];
  return (
    <div className="page">
      <PageHeader
        title={meta.title}
        subtitle={meta.sub}
        back={
          <Link to="/app/settings" className="back">
            <ArrowLeft size={16} aria-hidden /> Settings
          </Link>
        }
      />
      <div className="card card--pad rise" style={{ maxWidth: 640 }}>
        <Body />
      </div>
    </div>
  );
};
