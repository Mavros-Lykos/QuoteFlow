import { Mastra } from '@mastra/core';
import { quoteAgent } from './agents/quote-agent.ts';
import { quoteWorkflow } from './workflows/quote-workflow.ts';

/**
 * QuoteFlow Mastra harness
 * - Agent: tool-calling estimating agent
 * - Workflow: SerpApi rates → FastAPI open-weight quote pipeline
 */
export const mastra = new Mastra({
  agents: { quoteAgent },
  workflows: { quoteWorkflow },
});
