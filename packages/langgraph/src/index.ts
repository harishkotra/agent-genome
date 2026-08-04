import { ChatAnthropic } from '@langchain/anthropic';
import { HumanMessage } from '@langchain/core/messages';
import { ChatOllama } from '@langchain/ollama';
import { ChatOpenAI } from '@langchain/openai';
import { Annotation, END, START, StateGraph } from '@langchain/langgraph';

export type Provider = 'openai' | 'anthropic' | 'ollama' | 'openai-compatible';
export type ModelConfig = { provider: Provider; model: string; apiKey?: string; baseUrl?: string };
export type ReflectionInput = { goal: string; fitness: number; memories: { action: string; outcome: string }[]; genome: Record<string, number> };
export type ReflectionResult = { reflection: string; adjustments: Record<string, number> };

const ReflectionState = Annotation.Root({ input: Annotation<ReflectionInput>, reflection: Annotation<string>, adjustments: Annotation<Record<string, number>> });
const systemPrompt = `You are a reflection node inside an evolutionary simulation. Return strict JSON only: {"reflection":"one short sentence","adjustments":{"curiosity":-1|0|1,"risk":-1|0|1,"planning":-1|0|1}}. Make small bounded suggestions based only on the evidence.`;

function modelFor(config: ModelConfig) {
  if (config.provider === 'anthropic') return new ChatAnthropic({ apiKey: config.apiKey, model: config.model, temperature: 0 });
  if (config.provider === 'ollama') return new ChatOllama({ baseUrl: config.baseUrl || 'http://localhost:11434', model: config.model, temperature: 0, format: 'json' });
  return new ChatOpenAI({ apiKey: config.apiKey || 'not-required', model: config.model, temperature: 0, configuration: config.provider === 'openai-compatible' ? { baseURL: config.baseUrl } : undefined });
}

function parseResult(content: unknown): ReflectionResult {
  const text = typeof content === 'string' ? content : JSON.stringify(content);
  try { const parsed = JSON.parse(text.replace(/^```json\s*|\s*```$/g, '')); return { reflection: String(parsed.reflection || 'Reflection unavailable.'), adjustments: Object.fromEntries(Object.entries(parsed.adjustments || {}).map(([key, value]) => [key, Math.max(-1, Math.min(1, Number(value) || 0))])) }; }
  catch { return { reflection: 'Reflection could not be parsed; genome unchanged.', adjustments: {} }; }
}

/** A real LangGraph workflow with explicit observe, evaluate, reflect, and bounded-update nodes. */
export async function reflect(config: ModelConfig, input: ReflectionInput): Promise<ReflectionResult> {
  const model = modelFor(config);
  const graph = new StateGraph(ReflectionState)
    .addNode('observe', async (state) => ({ input: state.input }))
    .addNode('evaluate', async (state) => ({ input: state.input }))
    .addNode('reflect', async (state) => { const response = await model.invoke([new HumanMessage(`${systemPrompt}\nEvidence: ${JSON.stringify(state.input)}`)]); const result = parseResult(response.content); return { reflection: result.reflection, adjustments: result.adjustments }; })
    .addNode('updateGenome', async (state) => ({ reflection: state.reflection, adjustments: state.adjustments }))
    .addEdge(START, 'observe').addEdge('observe', 'evaluate').addEdge('evaluate', 'reflect').addEdge('reflect', 'updateGenome').addEdge('updateGenome', END)
    .compile();
  const result = await graph.invoke({ input, reflection: '', adjustments: {} });
  return { reflection: result.reflection, adjustments: result.adjustments };
}
