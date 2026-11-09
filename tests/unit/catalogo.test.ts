import { existsSync, readdirSync, readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { AREAS, JOGOS } from "../../src/lib/jogos";

const ids = JOGOS.map((jogo) => jogo.id as string);
const ordenado = (lista: string[]) => [...lista].sort();

test("ids do catálogo são únicos e servem de caminho", () => {
  expect(new Set(ids).size).toBe(ids.length);
  ids.forEach((id) => expect(id).toMatch(/^[a-z0-9-]+$/));
});

test("toda página e toda pasta de jogo estão no catálogo", () => {
  const paginas = readdirSync("src/pages/jogos").map((arquivo) => arquivo.replace(/\.astro$/, ""));
  const pastas = readdirSync("src/jogos").filter((pasta) => pasta !== "kit");
  expect(ordenado(paginas)).toEqual(ordenado(ids));
  expect(ordenado(pastas)).toEqual(ordenado(ids));
});

test.each(ids)("%s segue a estrutura de um jogo", (id) => {
  const pagina = readFileSync(`src/pages/jogos/${id}.astro`, "utf8");
  expect(pagina).toContain(`<Jogo id="${id}">`);
  expect(pagina).toContain(`import "../../jogos/${id}/jogo";`);
  expect(existsSync(`src/jogos/${id}/logica.ts`)).toBe(true);
  expect(existsSync(`public/img/jogos/${id}.svg`)).toBe(true);
  expect(existsSync(`tests/unit/${id}.test.ts`)).toBe(true);
});

test.each(JOGOS.map((jogo) => [jogo.id, jogo] as const))("%s tem área, habilidades e idade no guia", (_, jogo) => {
  expect(jogo.areas.length).toBeGreaterThan(0);
  expect(new Set(jogo.areas).size).toBe(jogo.areas.length);
  jogo.areas.forEach((area) => expect(Object.keys(AREAS)).toContain(area));
  expect(jogo.habilidades.length).toBeGreaterThan(0);
  const [de, ate] = jogo.idade;
  expect(Number.isInteger(de) && Number.isInteger(ate)).toBe(true);
  expect(de).toBeGreaterThanOrEqual(4);
  expect(ate).toBeGreaterThan(de);
  expect(ate).toBeLessThanOrEqual(14);
});
