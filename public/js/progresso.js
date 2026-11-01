// Regra pura de mesclagem: progresso nunca regride, seja qual for o aparelho.
export function mesclar(a, b) {
  return {
    recorde: Math.max(a?.recorde ?? 0, b?.recorde ?? 0),
    fase: Math.max(a?.fase ?? 1, b?.fase ?? 1),
  };
}
