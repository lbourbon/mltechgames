import { readdirSync, readFileSync } from "node:fs";
import { expect, test } from "vitest";

// O CSS do site vale em todas as páginas, inclusive dentro dos jogos. Uma classe que ele
// estiliza solta, sem um ancestral na frente, vaza para qualquer jogo que use o mesmo nome:
// foi assim que a marca do cabeçalho esticou as bolinhas de progresso de oito jogos.

const semComentarios = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "");

// Todos os seletores do arquivo: o que vem antes de cada "{", separado nas vírgulas.
const seletores = (css: string) =>
  [...semComentarios(css).matchAll(/([^{}]+)\{/g)]
    .flatMap(([, antes]) => antes.split(","))
    .map((seletor) => seletor.trim())
    .filter((seletor) => seletor && !seletor.startsWith("@"));

const classesDe = (texto: string) => [...texto.matchAll(/\.(-?[a-zA-Z_][\w-]*)/g)].map(([, nome]) => nome);

// As classes do primeiro pedaço do seletor, que não dependem de ancestral nenhum.
const soltas = (css: string) => new Set(seletores(css).flatMap((seletor) => classesDe(seletor.split(/[\s>+~]/)[0])));

// Nomes que os jogos reaproveitam do site de propósito, ou onde o vazamento não tem efeito.
const DE_PROPOSITO = [
  // O botão do site, com ajustes de tamanho em alguns jogos.
  "botao",
  // A garagem da Corrida usa o cartão da página inicial.
  "cartao",
  // No Avião são círculos de SVG, onde as regras da janela de diálogo não fazem nada.
  "janela",
];

const doSite = soltas(readFileSync("src/styles/site.css", "utf8"));
const jogos = readdirSync("src/jogos").filter((pasta) => pasta !== "kit");

test.each(jogos)("o CSS do site não vaza para as classes de %s", (jogo) => {
  const css = readFileSync(`src/jogos/${jogo}/jogo.css`, "utf8");
  const usadas = new Set(seletores(css).flatMap(classesDe));
  const vazando = [...usadas].filter((nome) => doSite.has(nome) && !DE_PROPOSITO.includes(nome));
  expect(vazando).toEqual([]);
});
