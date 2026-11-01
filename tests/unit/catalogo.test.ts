import { existsSync, readdirSync, readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { JOGOS } from "../../src/lib/jogos";

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
