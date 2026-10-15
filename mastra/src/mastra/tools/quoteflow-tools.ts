import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const API_BASE = process.env.QUOTEFLOW_API_BASE || 'http://127.0.0.1:8000/api';

async function apiGet(path: string) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return res.json();
}

async function apiPost(path: string, body: unknown) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`POST ${path} → ${res.status}: ${detail}`);
  }
  return res.json();
}

/** Live / offline regional labor rates (SerpApi-backed FastAPI tool). */
export const marketBenchmarkTool = createTool({
  id: 'market-benchmark',
  description:
    'Fetch regional contractor hourly labor rates by trade and ZIP code. Grounds pricing in local market data.',
  inputSchema: z.object({
    trade: z.string().describe('Trade type e.g. Plumbing, Electrical'),
    zip_code: z.string().describe('US ZIP code'),
  }),
  outputSchema: z.object({
    trade: z.string(),
    region_zip: z.string(),
    avg_hourly_rate: z.number(),
    low_hourly_rate: z.number(),
    high_hourly_rate: z.number(),
    source: z.string(),
    retrieved_at: z.string(),
  }),
  execute: async ({ trade, zip_code }) => {
    return apiGet(
      `/benchmarks?trade=${encodeURIComponent(trade)}&zip_code=${encodeURIComponent(zip_code)}`,
    );
  },
});

/** Full QuoteFlow pipeline: Tiger memory → SerpApi → Gemma/Ollama|Groq → TabPFN → Temporal follow-up. */
export const generateQuoteTool = createTool({
  id: 'generate-complete-quote',
  description:
    'Run the full QuoteFlow estimating pipeline: historical job memory, market rates, open-weight LLM BOM + proposal, TabPFN price calibration, durable follow-up scheduling. Returns the complete quote object.',
  inputSchema: z.object({
    prompt: z.string().describe('Contractor job scope / voice transcript'),
    trade_type: z
      .string()
      .default('Plumbing')
      .describe('Plumbing | Electrical | Carpentry / Remodeling | HVAC | Roofing | Painting | General Contracting'),
    target_margin_percent: z.number().default(30),
    client_name: z.string().optional(),
    client_phone: z.string().optional(),
    client_email: z.string().optional(),
    client_address: z.string().optional(),
    zip_code: z.string().default('97401'),
    model_id: z.string().optional().describe('e.g. gemma3:4b or groq-gemma2-9b'),
    use_live_benchmarks: z.boolean().default(true),
  }),
  execute: async (input) => {
    return apiPost('/quotes/generate', {
      prompt: input.prompt,
      trade_type: input.trade_type,
      target_margin_percent: input.target_margin_percent,
      model_id: input.model_id || 'gemma3:4b',
      use_live_benchmarks: input.use_live_benchmarks ?? true,
      client_info: {
        name: input.client_name || 'Valued Customer',
        phone: input.client_phone || '',
        email: input.client_email || '',
        address: input.client_address || 'Jobsite',
        zip_code: input.zip_code || '97401',
      },
    });
  },
});

/** List past quotes for memory / win-rate context. */
export const listQuotesTool = createTool({
  id: 'list-past-quotes',
  description: 'List historical contractor quotes (wins, losses, drafts) from QuoteFlow memory.',
  inputSchema: z.object({}),
  execute: async () => {
    const quotes = await apiGet('/quotes');
    return {
      count: Array.isArray(quotes) ? quotes.length : 0,
      quotes: Array.isArray(quotes)
        ? quotes.slice(0, 10).map((q: any) => ({
            id: q.id,
            title: q.project_title,
            trade: q.trade_type,
            total: q.total_amount,
            status: q.status,
          }))
        : [],
    };
  },
});
