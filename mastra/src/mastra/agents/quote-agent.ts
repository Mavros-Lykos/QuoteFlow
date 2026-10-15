import { Agent } from '@mastra/core/agent';
import {
  marketBenchmarkTool,
  generateQuoteTool,
  listQuotesTool,
} from '../tools/quoteflow-tools.ts';

const model = process.env.MASTRA_MODEL || 'openai/gpt-4o-mini';

/**
 * Mastra agent that orchestrates QuoteFlow over open-weight models.
 * Reasoning model (router) decides tools; FastAPI runs Gemma/TabPFN/SerpApi/Temporal.
 */
export const quoteAgent = new Agent({
  id: 'quoteflow-agent',
  name: 'QuoteFlow Estimating Agent',
  instructions: `
You are QuoteFlow AI — an estimating agent for independent contractors (plumbers, electricians, HVAC, carpenters).

Always:
1. Optionally call list-past-quotes for pricing memory context.
2. Call market-benchmark with the trade + ZIP when the user mentions a location.
3. Call generate-complete-quote with the full job scope — that tool runs local/open-weight Gemma (or Groq open-weight), TabPFN pricing, and durable follow-ups.
4. Summarize the returned quote: project title, total, TabPFN suggestion, and next follow-up.

Never invent line items yourself when generate-complete-quote is available — use the tool.
Protect client privacy: do not echo full addresses in chat summaries unless asked.
`,
  model,
  tools: {
    marketBenchmarkTool,
    generateQuoteTool,
    listQuotesTool,
  },
});
