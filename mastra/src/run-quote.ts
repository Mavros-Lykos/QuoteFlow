/**
 * CLI smoke test: run the Mastra quote workflow against a local FastAPI backend.
 * Usage: npm run generate
 */
import { mastra } from './mastra/index.ts';

const workflow =
  (mastra as any).getWorkflow?.('quoteWorkflow') ||
  (mastra as any).getWorkflowById?.('quoteflow-estimate-workflow');
if (!workflow) {
  throw new Error('quoteWorkflow not registered on Mastra instance');
}
const run = await workflow.createRun();
const result = await run.start({
  inputData: {
    prompt:
      'Replace 50-gal electric water heater with Navien tankless, upsize gas line, include permit.',
    trade_type: 'Plumbing',
    zip_code: '97477',
    target_margin_percent: 30,
    client_name: 'Sarah Jenkins',
    client_address: '742 Evergreen Terrace',
    model_id: 'gemma3:4b',
  },
});

console.log(JSON.stringify(result, null, 2));
