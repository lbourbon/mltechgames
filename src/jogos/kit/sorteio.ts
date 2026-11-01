// Sorteios sem DOM, para as regras dos jogos: quem testa injeta um rng previsível.
export type Rng = () => number;

export const sortear = (min: number, max: number, rng: Rng) => min + Math.floor(rng() * (max - min + 1));

export function embaralhar<T>(lista: T[], rng: Rng) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}
