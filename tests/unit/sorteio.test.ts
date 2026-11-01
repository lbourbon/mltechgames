import { expect, test } from "vitest";
import { embaralhar, sortear } from "../../src/jogos/kit/sorteio";

test("sortear alcança os dois extremos e não sai deles", () => {
  expect(sortear(3, 6, () => 0)).toBe(3);
  expect(sortear(3, 6, () => 0.999)).toBe(6);
});

test("embaralhar mantém os itens e não altera a lista original", () => {
  const lista = [1, 2, 3, 4, 5];
  const copia = embaralhar(lista, () => 0);
  expect(copia).not.toEqual(lista);
  expect([...copia].sort()).toEqual(lista);
  expect(lista).toEqual([1, 2, 3, 4, 5]);
});
