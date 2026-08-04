import { crossover, type Genome } from '@agent-genome/genome';
import { remember, type Memory } from '@agent-genome/core';

export type WorldPoint = { x: number; y: number };
export type Resource = WorldPoint & { id: string; available: boolean };
export type Hazard = WorldPoint & { id: string };
export type SimAgent = {
  id: string; genome: Genome; fitness: number; parents: string[]; position: WorldPoint;
  velocity: WorldPoint; hue: number; goal: string; memories: Memory[]; reflection: string;
  collected: number; avoided: number; cooperation: number;
};
export type World = { generation: number; resources: Resource[]; hazards: Hazard[]; agents: SimAgent[] };

const clamp = (v: number, min = 0, max = 100) => Math.max(min, Math.min(max, v));
const distance = (a: WorldPoint, b: WorldPoint) => Math.hypot(a.x - b.x, a.y - b.y);
const traits = ['planning','memory','risk','curiosity','cooperation','explorationRadius','toolUsage','reflectionFrequency'] as const;

export const createGenome = (seed: number): Genome => Object.fromEntries(traits.map((trait, index) => [trait, 3 + ((seed * 7 + index * 3) % 7)])) as Genome;
export const createWorld = (generation = 1, population = 40): World => ({
  generation,
  resources: Array.from({ length: 14 }, (_, i) => ({ id: `R-${i}`, x: 8 + ((i * 23 + generation * 7) % 84), y: 8 + ((i * 37 + generation * 3) % 84), available: true })),
  hazards: Array.from({ length: 5 }, (_, i) => ({ id: `H-${i}`, x: 14 + ((i * 31 + generation * 11) % 72), y: 13 + ((i * 17 + generation * 19) % 74) })),
  agents: Array.from({ length: population }, (_, i) => createAgent(i, generation)),
});

export const createAgent = (index: number, generation: number, genome = createGenome(index + generation), parents: string[] = []): SimAgent => ({
  id: `AG-${String(index + 1).padStart(3, '0')}`, genome, parents, position: { x: 10 + ((index * 19) % 80), y: 10 + ((index * 29) % 80) }, velocity: { x: 0, y: 0 }, hue: 180 + ((index * 37) % 160), fitness: 0,
  goal: 'surveying the field', memories: [], reflection: 'No reflection recorded yet.', collected: 0, avoided: 0, cooperation: 0,
});

/** Advances the deterministic world mechanics; no renderer or LLM is required for this step. */
export function stepWorld(world: World, deltaSeconds: number): World {
  for (const agent of world.agents) {
    const resource = world.resources.filter((r) => r.available).sort((a, b) => distance(agent.position, a) - distance(agent.position, b))[0];
    const hazard = world.hazards.sort((a, b) => distance(agent.position, a) - distance(agent.position, b))[0];
    const nearHazard = hazard && distance(agent.position, hazard) < 16;
    const target = nearHazard ? { x: agent.position.x * 2 - hazard.x, y: agent.position.y * 2 - hazard.y } : resource ?? { x: 50, y: 50 };
    const dx = target.x - agent.position.x, dy = target.y - agent.position.y;
    const magnitude = Math.max(1, Math.hypot(dx, dy));
    const intent = nearHazard ? 'avoiding a hazard' : resource ? 'following a resource signal' : 'surveying the field';
    const force = (0.008 + agent.genome.curiosity * 0.002) * (nearHazard ? 1 + agent.genome.risk / 12 : 1);
    agent.velocity.x = agent.velocity.x * 0.93 + (dx / magnitude) * force;
    agent.velocity.y = agent.velocity.y * 0.93 + (dy / magnitude) * force;
    agent.position.x = clamp(agent.position.x + agent.velocity.x * deltaSeconds * 55, 2, 98);
    agent.position.y = clamp(agent.position.y + agent.velocity.y * deltaSeconds * 55, 2, 98);
    agent.goal = intent;
    if (resource && resource.available && distance(agent.position, resource) < 3.8) {
      resource.available = false; agent.collected += 1; agent.fitness += 12 + agent.genome.planning;
      agent.memories = remember(agent.memories, { action: 'collected a resource', outcome: 'success', at: Date.now() });
    }
    if (nearHazard && distance(agent.position, hazard) > 7) { agent.avoided += 1; agent.fitness += 0.015 * agent.genome.planning; }
    const allies = world.agents.filter((other) => other.id !== agent.id && distance(other.position, agent.position) < 7);
    if (allies.length && agent.genome.cooperation > 6) { agent.cooperation += 1; agent.fitness += 0.006 * allies.length; }
    agent.fitness += 0.002 * agent.genome.explorationRadius;
  }
  return world;
}

export function nextGeneration(world: World, mutationRate: number): World {
  const ranked = [...world.agents].sort((a, b) => b.fitness - a.fitness);
  const elite = ranked.slice(0, Math.max(2, Math.ceil(ranked.length * 0.35)));
  const agents = world.agents.map((_, index) => {
    const parentA = elite[index % elite.length], parentB = elite[(index * 7 + 3) % elite.length];
    return createAgent(index, world.generation + 1, crossover(parentA.genome, parentB.genome, mutationRate), [parentA.id, parentB.id]);
  });
  return createWorldFromAgents(world.generation + 1, agents);
}

const createWorldFromAgents = (generation: number, agents: SimAgent[]): World => ({ ...createWorld(generation, 0), agents });
export const averageGenome = (agents: SimAgent[]): Genome => Object.fromEntries(traits.map((trait) => [trait, Math.round(agents.reduce((sum, agent) => sum + agent.genome[trait], 0) / Math.max(agents.length, 1))])) as Genome;
export const fitnessSummary = (agents: SimAgent[]) => ({ average: agents.reduce((sum, agent) => sum + agent.fitness, 0) / Math.max(agents.length, 1), best: Math.max(0, ...agents.map((agent) => agent.fitness)) });
