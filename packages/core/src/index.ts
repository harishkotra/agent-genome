export const MAX_MEMORIES=20;
export type Memory={action:string; outcome:'success'|'failure'; at:number};
export const remember=(memories:Memory[],memory:Memory)=>[...memories,memory].slice(-MAX_MEMORIES);
