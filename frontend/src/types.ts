export interface LineItem {
  id?: string;
  category: string;
  description: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  total_cost: number;
}

export interface ClientInfo {
  name: string;
  phone: string;
  email: string;
  address: string;
  zip_code: string;
}

export interface MarketBenchmark {
  trade: string;
  region_zip: string;
  avg_hourly_rate: number;
  low_hourly_rate: number;
  high_hourly_rate: number;
  source: string;
  retrieved_at: string;
}

export interface PricingPrediction {
  suggested_price: number;
  confidence_score: number;
  recommended_range_min: number;
  recommended_range_max: number;
  model_used: string;
  rationale: string;
}

export interface Quote {
  id: string;
  quote_number: string;
  created_at: string;
  client: ClientInfo;
  trade_type: string;
  project_title: string;
  project_scope_summary: string;
  line_items: LineItem[];
  subtotal_materials: number;
  subtotal_labor: number;
  permits_and_fees: number;
  target_margin_percent: number;
  tax_percent: number;
  tax_amount: number;
  total_amount: number;
  valid_until: string;
  terms_and_conditions: string;
  client_proposal_prose: string;
  llm_model_used: string;
  llm_provider: string;
  inference_time_ms: number;
  market_benchmark?: MarketBenchmark | null;
  tabpfn_prediction?: PricingPrediction | null;
  follow_up_workflow_scheduled: boolean;
  status: 'draft' | 'sent' | 'approved' | 'lost' | 'expired' | 'completed';
}

export interface ModelOption {
  id: string;
  name: string;
  provider: 'ollama' | 'groq' | 'mock';
  size: string;
  vram_required_gb: number;
  recommended_min_ram_gb: number;
  description: string;
  is_default: boolean;
  is_local: boolean;
}

export interface StatsData {
  total_quotes_count: number;
  total_quoted_volume: number;
  approved_quotes_count: number;
  lost_quotes_count?: number;
  win_rate_percent: number;
  avg_inference_ms?: number;
  avg_estimating_time_minutes: number;
  legacy_turnaround_hours: number;
  hours_saved_month: number;
  metric_note?: string;
}

export interface ContractorProfile {
  business_name: string;
  contractor_name: string;
  phone: string;
  email: string;
  license_number: string;
  currency_code: string;
  currency_symbol: string;
  default_hourly_rate: number;
  default_markup_percent: number;
  default_tax_percent: number;
  default_trade: string;
  preferred_model_id: string;
  terms_template: string;
  theme?: string;
}

export interface SavedClient extends ClientInfo {
  id: string;
  created_at: string;
}

export type AiMode = 'standard' | 'local';
export type ThemePref = 'system' | 'light' | 'dark';

/** Device-level preferences. Stored only in this browser / desktop app. */
export interface Prefs {
  onboarded: boolean;
  country: string;
  currency_code: string;
  currency_symbol: string;
  locale: string;
  tax_label: string;
  units: 'imperial' | 'metric';
  ai_mode: AiMode;
  theme: ThemePref;
  groq_key: string;
  demo_banner_dismissed: boolean;
  /** Desktop first-run AI setup complete (ignored on web). */
  ai_ready: boolean;
}

