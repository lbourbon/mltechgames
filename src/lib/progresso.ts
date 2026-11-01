export type Progresso = { recorde: number; fase: number };

// Regra pura de mesclagem: progresso nunca regride, seja qual for o aparelho.
export function mesclar(a?: Partial<Progresso> | null, b?: Partial<Progresso> | null): Progresso {
  return {
    recorde: Math.max(a?.recorde ?? 0, b?.recorde ?? 0),
    fase: Math.max(a?.fase ?? 1, b?.fase ?? 1),
  };
}

export const mesmoProgresso = (a: Partial<Progresso> | undefined, b: Progresso) =>
  a?.recorde === b.recorde && a?.fase === b.fase;
