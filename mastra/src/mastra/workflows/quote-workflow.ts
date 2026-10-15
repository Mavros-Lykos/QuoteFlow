import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

const API_BASE = process.env.QUOTEFLOW_API_BASE || 'http://127.0.0.1:8000/api';

const intakeSchema = z.object({
  prompt: z.string(),
  trade_type: z.string().default('Plumbing'),
  zip_code: z.string().default('97401'),
  target_margin_percent: z.number().default(30),
  client_name: z.string().optional(),
  client_address: z.string().optional(),
  model_id: z.string().optional(),
});

const withMarketSchema = intakeSchema.extend({
  market_avg_hourly: z.number().optional(),
  market_source: z.string().optional(),
});

const resultSchema = z.object({
  quote_id: z.string(),
  quote_number: z.string(),
  project_title: z.string(),
  total_amount: z.number(),
  llm_model_used: z.string(),
  llm_provider: z.string(),
  market_source: z.string().optional(),
  tabpfn_suggested: z.number().optional(),
  follow_up_scheduled: z.boolean(),
});

/** Step 1 — ground in live/offline market rates */
const marketStep = createStep({
  id: 'serpapi-market-rates',
  inputSchema: intakeSchema,
  outputSchema: withMarketSchema,
  execute: async ({ inputData }) => {
    const url = `${API_BASE}/benchmarks?trade=${encodeURIComponent(inputData.trade_type)}&zip_code=${encodeURIComponent(inputData.zip_code)}`;
    const bm = await fetch(url).then((r) => r.json());
    return {
      ...inputData,
      market_avg_hourly: bm.avg_hourly_rate,
      market_source: bm.source,
    };
  },
});

/** Step 2 — full pipeline (Tiger memory + LLM + TabPFN + Temporal) via FastAPI */
const generateStep = createStep({
  id: 'generate-quote-pipeline',
  inputSchema: withMarketSchema,
  outputSchema: resultSchema,
  execute: async ({ inputData }) => {
    const res = await fetch(`${API_BASE}/quotes/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: inputData.prompt,
        trade_type: inputData.trade_type,
        target_margin_percent: inputData.target_margin_percent,
        model_id: inputData.model_id || 'gemma3:4b',
        use_live_benchmarks: true,
        client_info: {
          name: inputData.client_name || 'Valued Customer',
          phone: '',
          email: '',
          address: inputData.client_address || 'Jobsite',
          zip_code: inputData.zip_code,
        },
      }),
    });
    if (!res.ok) throw new Error(`Quote generate failed: ${res.status} ${await res.text()}`);
    const q = await res.json();
    return {
      quote_id: q.id,
      quote_number: q.quote_number,
      project_title: q.project_title,
      total_amount: q.total_amount,
      llm_model_used: q.llm_model_used,
      llm_provider: q.llm_provider,
      market_source: inputData.market_source || q.market_benchmark?.source,
      tabpfn_suggested: q.tabpfn_prediction?.suggested_price,
      follow_up_scheduled: !!q.follow_up_workflow_scheduled,
    };
  },
});

/**
 * Deterministic Mastra workflow: Market rates → QuoteFlow open-weight pipeline.
 */
export const quoteWorkflow = createWorkflow({
  id: 'quoteflow-estimate-workflow',
  inputSchema: intakeSchema,
  outputSchema: resultSchema,
})
  .then(marketStep)
  .then(generateStep)
  .commit();
