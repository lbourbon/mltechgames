import { expect, test } from "vitest";
import { idsLocais, lerProgresso, lerSomLigado, lerUltimosJogos, limparProgresso, marcarJogado, salvarProgresso, salvarSomLigado } from "../../src/lib/local";

// Os testes rodam sem navegador, como um aparelho que bloqueia o localStorage: nada pode
// lançar erro, e o progresso vale enquanto a página estiver aberta.
test("sem localStorage, o progresso vive na memória da página", () => {
  expect(lerProgresso("monstrinho")).toEqual({ recorde: 0, fase: 1 });
  salvarProgresso("monstrinho", { recorde: 120, fase: 4 });
  expect(lerProgresso("monstrinho")).toEqual({ recorde: 120, fase: 4 });
  expect(idsLocais()).toEqual(["monstrinho"]);
});

test("sem localStorage, os últimos jogos e o som também funcionam", () => {
  marcarJogado("robo");
  marcarJogado("luz");
  expect(lerUltimosJogos()).toEqual(["luz", "robo"]);
  expect(lerSomLigado()).toBe(true);
  salvarSomLigado(false);
  expect(lerSomLigado()).toBe(false);
});

test("apagar o progresso também limpa a memória", () => {
  salvarProgresso("luz", { recorde: 10, fase: 2 });
  limparProgresso();
  expect(idsLocais()).toEqual([]);
  expect(lerUltimosJogos()).toEqual([]);
});
