import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type {
  ClientInfo,
  ContractorProfile,
  ModelOption,
  Prefs,
  Quote,
  SavedClient,
} from '../types';
import { api, isDesktop } from './platform';
import { detectCountry, findCountry } from './countries';

const LS_PREFS = 'quoteflow_prefs_v2';
const LS_PROFILE = 'quoteflow_profile_v2';
const LS_CLIENTS = 'quoteflow_clients_v2';

export const STANDARD_MODEL = 'groq-gemma2-9b';
export const LOCAL_MODEL = 'gemma3:4b';

/** Sample rows the backend seeds for demos. Real users should never see them. */
const isSeedQuote = (q: Quote) => /^q-1\d\d$/.test(q.id);

function defaultPrefs(): Prefs {
  const c = detectCountry();
  return {
    onboarded: false,
    country: c.code,
    currency_code: c.currency,
    currency_symbol: c.symbol,
    locale: c.locale,
    tax_label: c.taxLabel,
    units: c.units,
    ai_mode: 'standard',
    theme: 'system',
    groq_key: '',
    demo_banner_dismissed: false,
    ai_ready: false,
  };
}

function defaultProfile(prefs: Prefs): ContractorProfile {
  const c = findCountry(prefs.country);
  return {
    business_name: '',
    contractor_name: '',
    phone: '',
    email: '',
    license_number: '',
    currency_code: prefs.currency_code,
    currency_symbol: prefs.currency_symbol,
    default_hourly_rate: c.hourly,
    default_markup_percent: 30,
    default_tax_percent: c.taxRate,
    default_trade: 'Plumbing',
    preferred_model_id: prefs.ai_mode === 'local' ? LOCAL_MODEL : STANDARD_MODEL,
    terms_template: '50% deposit on acceptance, balance on completion. Estimate valid for 30 days.',
    theme: 'light',
  };
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? ({ ...fallback, ...JSON.parse(raw) } as T) : fallback;
  } catch {
    return fallback;
  }
}

export interface GenerateInput {
  prompt: string;
  trade_type: string;
  client_info: ClientInfo;
  target_margin_percent: number;
}

export interface Stats {
  count: number;
  quoted: number;
  won: number;
  lost: number;
  winRate: number | null;
}

interface AppContextValue {
  prefs: Prefs;
  profile: ContractorProfile;
  clients: SavedClient[];
  quotes: Quote[];
  models: ModelOption[];
  stats: Stats;
  loading: boolean;
  online: boolean;
  setPrefs: (patch: Partial<Prefs>) => void;
  setProfile: (patch: Partial<ContractorProfile>) => Promise<void>;
  setCountry: (code: string) => void;
  refresh: () => Promise<void>;
  generate: (input: GenerateInput) => Promise<Quote>;
  setStatus: (id: string, status: 'draft' | 'sent' | 'approved' | 'lost') => Promise<void>;
  addClient: (c: ClientInfo) => SavedClient;
  exportAll: () => string;
  wipeDevice: () => void;
  money: (n: number, whole?: boolean) => string;
}

const Ctx = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used inside AppProvider');
  return v;
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [prefs, setPrefsState] = useState<Prefs>(() => readJson(LS_PREFS, defaultPrefs()));
  const [profile, setProfileState] = useState<ContractorProfile>(() =>
    readJson(LS_PROFILE, defaultProfile(readJson(LS_PREFS, defaultPrefs())))
  );
  const [clients, setClients] = useState<SavedClient[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(LS_CLIENTS) || '[]');
    } catch {
      return [];
    }
  });
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(true);

  useEffect(() => localStorage.setItem(LS_PREFS, JSON.stringify(prefs)), [prefs]);
  useEffect(() => localStorage.setItem(LS_PROFILE, JSON.stringify(profile)), [profile]);
  useEffect(() => localStorage.setItem(LS_CLIENTS, JSON.stringify(clients)), [clients]);

  // Apply theme to <html>.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = prefs.theme === 'dark' || (prefs.theme === 'system' && mq.matches);
      document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#101418' : '#F5F3EE');
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [prefs.theme]);

  const refresh = useCallback(async () => {
    try {
      const [q, m] = await Promise.all([api<Quote[]>('/quotes'), api<ModelOption[]>('/models')]);
      setQuotes(q.filter((x) => !isSeedQuote(x)));
      setModels(m);
      setOnline(true);
    } catch {
      setOnline(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Customers from existing estimates become saved customers automatically.
  useEffect(() => {
    if (quotes.length === 0) return;
    setClients((prev) => {
      const key = (x: ClientInfo) => `${x.name.trim().toLowerCase()}|${(x.phone || '').trim()}`;
      const known = new Set(prev.map(key));
      const add: SavedClient[] = [];
      quotes.forEach((q, i) => {
        const c = q.client;
        if (!c.name || c.name === 'Sample customer' || known.has(key(c))) return;
        known.add(key(c));
        add.push({ ...c, phone: c.phone || '', email: c.email || '', id: `c-${Date.now().toString(36)}-${i}`, created_at: q.created_at });
      });
      return add.length ? [...prev, ...add] : prev;
    });
  }, [quotes]);

  const setPrefs = useCallback((patch: Partial<Prefs>) => {
    setPrefsState((p) => ({ ...p, ...patch }));
  }, []);

  const setProfile = useCallback(
    async (patch: Partial<ContractorProfile>) => {
      const next = { ...profile, ...patch };
      setProfileState(next);
      // Best effort: the local server uses the profile for PDFs and prompts.
      try {
        await api('/profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) });
      } catch {
        /* offline: the device copy is the source of truth */
      }
    },
    [profile]
  );

  const setCountry = useCallback(
    (code: string) => {
      const c = findCountry(code);
      setPrefsState((p) => ({
        ...p,
        country: c.code,
        currency_code: c.currency,
        currency_symbol: c.symbol,
        locale: c.locale,
        tax_label: c.taxLabel,
        units: c.units,
      }));
      void setProfile({
        currency_code: c.currency,
        currency_symbol: c.symbol,
        default_tax_percent: c.taxRate,
        default_hourly_rate: c.hourly,
      });
    },
    [setProfile]
  );

  const addClient = useCallback(
    (c: ClientInfo): SavedClient => {
      const key = (x: ClientInfo) => `${x.name.trim().toLowerCase()}|${x.phone.trim()}`;
      const existing = clients.find((x) => key(x) === key(c));
      const saved: SavedClient = existing
        ? { ...existing, ...c }
        : { ...c, id: `c-${Date.now().toString(36)}`, created_at: new Date().toISOString() };
      setClients((prev) => (existing ? prev.map((x) => (x.id === existing.id ? saved : x)) : [saved, ...prev]));
      return saved;
    },
    [clients]
  );

  const generate = useCallback(
    async (input: GenerateInput): Promise<Quote> => {
      // Web demo always uses Standard (cloud). Desktop honors local vs online.
      const modelId = !isDesktop || prefs.ai_mode === 'standard' ? STANDARD_MODEL : LOCAL_MODEL;
      const quote = await api<Quote>('/quotes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: input.prompt,
          trade_type: input.trade_type,
          client_info: input.client_info,
          urgency: 'Standard',
          target_margin_percent: input.target_margin_percent,
          model_id: modelId,
          groq_api_key: prefs.groq_key || undefined,
          use_live_benchmarks: true,
          currency_code: prefs.currency_code,
          currency_symbol: prefs.currency_symbol,
          tax_percent: profile.default_tax_percent,
          tax_label: prefs.tax_label,
          units: prefs.units,
          hourly_rate: profile.default_hourly_rate,
          country_code: prefs.country,
        }),
      });
      setQuotes((prev) => [quote, ...prev]);
      return quote;
    },
    [prefs, profile.default_tax_percent, profile.default_hourly_rate]
  );

  const setStatus = useCallback(async (id: string, status: 'draft' | 'sent' | 'approved' | 'lost') => {
    await api(`/quotes/${id}/status?status=${status}`, { method: 'PATCH' });
    setQuotes((prev) => prev.map((q) => (q.id === id ? { ...q, status } : q)));
  }, []);

  const stats = useMemo<Stats>(() => {
    const won = quotes.filter((q) => q.status === 'approved').length;
    const lost = quotes.filter((q) => q.status === 'lost').length;
    return {
      count: quotes.length,
      quoted: quotes.reduce((s, q) => s + q.total_amount, 0),
      won,
      lost,
      winRate: won + lost > 0 ? Math.round((won / (won + lost)) * 100) : null,
    };
  }, [quotes]);

  const exportAll = useCallback(
    () => JSON.stringify({ exported_at: new Date().toISOString(), profile, clients, quotes }, null, 2),
    [profile, clients, quotes]
  );

  const wipeDevice = useCallback(() => {
    [LS_PREFS, LS_PROFILE, LS_CLIENTS].forEach((k) => localStorage.removeItem(k));
    window.location.href = '/';
  }, []);

  const money = useCallback(
    (n: number, whole?: boolean) =>
      new Intl.NumberFormat(prefs.locale, {
        style: 'currency',
        currency: prefs.currency_code,
        minimumFractionDigits: whole ? 0 : undefined,
        maximumFractionDigits: whole ? 0 : 2,
      }).format(n),
    [prefs.locale, prefs.currency_code]
  );

  const value: AppContextValue = {
    prefs,
    profile,
    clients,
    quotes,
    models,
    stats,
    loading,
    online,
    setPrefs,
    setProfile,
    setCountry,
    refresh,
    generate,
    setStatus,
    addClient,
    exportAll,
    wipeDevice,
    money,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};
