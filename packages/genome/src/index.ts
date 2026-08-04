export type GenomeTrait = 'planning'|'memory'|'risk'|'curiosity'|'cooperation'|'explorationRadius'|'toolUsage'|'reflectionFrequency';
export type Genome = Record<GenomeTrait, number>;
export const clampTrait=(value:number)=>Math.max(1,Math.min(10,Math.round(value)));
export function crossover(a:Genome,b:Genome,mutationRate=.08):Genome { const child={} as Genome; for(const key of Object.keys(a) as GenomeTrait[]){const inherited=Math.random()>.5?a[key]:b[key];child[key]=clampTrait(inherited+(Math.random()<mutationRate?(Math.random()>.5?1:-1):0));}return child; }
