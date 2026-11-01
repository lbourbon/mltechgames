import { expect, test } from "vitest";
import { mesclar, mesmoProgresso } from "../../src/lib/progresso";

test("sem dados, parte do recorde zero na fase 1", () => {
  expect(mesclar()).toEqual({ recorde: 0, fase: 1 });
});

test("mantém o maior valor de cada campo", () => {
  expect(mesclar({ recorde: 50, fase: 2 }, { recorde: 30, fase: 4 })).toEqual({ recorde: 50, fase: 4 });
});

test("ignora campos extras do documento remoto", () => {
  const remoto = { recorde: 2, fase: 1, atualizadoEm: "x" };
  expect(mesclar({ recorde: 1, fase: 1 }, remoto)).toEqual({ recorde: 2, fase: 1 });
});

test("documento remoto ausente nunca conta como igual", () => {
  expect(mesmoProgresso(undefined, { recorde: 0, fase: 1 })).toBe(false);
  expect(mesmoProgresso({ recorde: 3, fase: 2 }, { recorde: 3, fase: 2 })).toBe(true);
});
