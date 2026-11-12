// Fotografa os jogos para conferir o visual: a abertura e a partida de cada um, em qualquer
// tamanho de tela, fase e motor de navegador, e junta tudo numa folha. Também avisa quando
// um jogo passa da altura da tela. Olhe as fotos depois de mexer no CSS compartilhado: uma
// regra que vaza para os jogos não faz teste nenhum falhar. Precisa do site no ar.
//
//   node scripts/fotos.mjs [--base=http://localhost:4321] [--tamanho=360x640] [--fase=9]
//                          [--motor=webkit] [--saida=fotos] [ids separados por vírgula]
import { mkdirSync, readFileSync } from "node:fs";
import { chromium, webkit } from "@playwright/test";
import { JOGOS } from "../src/lib/jogos.ts";

const opcoes = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith("--")).map((a) => a.slice(2).split("=")),
);
const ids = process.argv.slice(2).find((a) => !a.startsWith("--"))?.split(",") ?? JOGOS.map((jogo) => jogo.id);
const base = opcoes.base ?? "http://localhost:4321";
const fase = Number(opcoes.fase ?? 1);
const saida = opcoes.saida ?? "fotos";
const [largura, altura] = (opcoes.tamanho ?? "360x640").split("x").map(Number);
mkdirSync(saida, { recursive: true });

const navegador = opcoes.motor === "webkit" ? await webkit.launch() : await chromium.launch({ channel: "chrome" });
const contexto = await navegador.newContext({ viewport: { width: largura, height: altura }, hasTouch: true });
const page = await contexto.newPage();
const erros = [];
page.on("pageerror", (erro) => erros.push(`${page.url()} ${erro.message}`));

const arquivos = [];
async function fotografar(nome) {
  const arquivo = `${saida}/${nome}.png`;
  await page.screenshot({ path: arquivo });
  arquivos.push(arquivo);
}

for (const id of ids) {
  // Uma fase adiantada começa pelo progresso guardado, como para quem volta ao jogo.
  await page.addInitScript(([jogo, salva]) => localStorage.setItem(`mltg:progresso:${jogo}`, JSON.stringify({ recorde: 0, fase: salva })), [id, fase]);
  await page.goto(`${base}/jogos/${id}/`);
  await page.waitForTimeout(700);
  await fotografar(`${id}-1-abertura`);

  await page.locator(`[data-acao="jogar"][data-fase="${fase}"]`).click();
  await page.waitForTimeout(1500);
  // Fecha as telas de novidade e a garagem até a partida aparecer.
  for (let i = 0; i < 4 && !(await page.locator("#painel").isHidden()); i++) {
    if (i === 0) await fotografar(`${id}-2-novidade`);
    const botao = page.locator('#painel [data-acao="seguir"], #painel [data-acao="correr"]').first();
    if (!(await botao.count())) break;
    await botao.click();
    await page.waitForTimeout(1300);
  }
  await fotografar(`${id}-3-partida`);

  const sobra = await page.evaluate(() => Math.round(innerHeight - document.querySelector(".jogo").getBoundingClientRect().bottom));
  const lado = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  console.log(`${id.padEnd(12)} sobra ${sobra}px${sobra < 0 ? "  PASSA DA TELA" : ""}${lado > 0 ? "  ROLA PARA O LADO" : ""}`);
}

// A folha: todas as fotos lado a lado, em linhas de oito.
const POR_LINHA = 8;
const imagens = arquivos
  .map((arquivo) => `<img style="width:${largura * 0.75}px;margin:3px;vertical-align:top" src="data:image/png;base64,${readFileSync(arquivo).toString("base64")}">`)
  .map((img, i) => ((i + 1) % POR_LINHA ? img : `${img}<br>`))
  .join("");
await page.setViewportSize({ width: POR_LINHA * (largura * 0.75 + 6) + 6, height: 100 });
await page.setContent(`<body style="margin:3px;background:#888">${imagens}</body>`);
await page.screenshot({ path: `${saida}/folha.png`, fullPage: true });
console.log(`${saida}/folha.png`);

if (erros.length) console.log(`ERROS:\n${erros.join("\n")}`);
await navegador.close();
process.exit(erros.length ? 1 : 0);
