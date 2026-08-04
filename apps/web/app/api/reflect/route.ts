import { NextRequest, NextResponse } from 'next/server';
import { reflect, type ModelConfig, type ReflectionInput } from '@agent-genome/langgraph';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { config, input } = await request.json() as { config: ModelConfig; input: ReflectionInput };
    if (!config?.provider || !config?.model || !input) return NextResponse.json({ error: 'Provider, model, and reflection input are required.' }, { status: 400 });
    const result = await reflect(config, input);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Reflection request failed.' }, { status: 500 });
  }
}
