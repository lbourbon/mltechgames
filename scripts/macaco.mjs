// Toques, arrastos e teclas ao acaso em cada jogo, para achar erros de JavaScript e
// travamentos que os testes não cobrem. Foi assim que apareceu o lançamento do Carteiro
// que travava para sempre. Precisa do site no ar, de preferência o build (npm run preview):
// no servidor de desenvolvimento, salvar um arquivo recarrega a página no meio da rodada.
//
//   node scripts/macaco.mjs [--base=http://localhost:8787] [--segundos=40]
//                           [--tamanho=390x700] [--motor=webkit] [ids separados por vírgula]
import { chromium, webkit } from "@playwright/test";
import { JOGOS } from "../src/lib/jogos.ts";

const opcoes = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith("--")).map((a) => a.slice(2).split("=")),
);
const ids = process.argv.slice(2).find((a) => !a.startsWith("--"))?.split(",") ?? JOGOS.map((jogo) => jogo.id);
const base = opcoes.base ?? "http://localhost:8787";
const segundos = Number(opcoes.segundos ?? 40);
const [largura, altura] = (opcoes.tamanho ?? "390x700").split("x").map(Number);

const navegador = opcoes.motor === "webkit" ? await webkit.launch() : await chromium.launch({ channel: "chrome" });
const acaso = (n) => Math.floor(Math.random() * n);

async function macaco(id) {
  const contexto = await navegador.newContext({ viewport: { width: largura, height: altura }, hasTouch: true });
  const page = await contexto.newPage();
  const erros = new Set();
  page.on("pageerror", (erro) => erros.add(`${erro.message}\n${(erro.stack ?? "").split("\n").slice(1, 4).join("\n")}`));
  page.on("console", (mensagem) => mensagem.type() === "error" && erros.add(`console: ${mensagem.text().slice(0, 300)}`));
  await page.goto(`${base}/jogos/${id}/`);
  await page.locator('[data-acao="jogar"][data-fase="1"]').click();

  const fim = Date.now() + segundos * 1000;
  const fases = new Set();
  let acoes = 0;
  let paineis = 0;
  while (Date.now() < fim) {
    acoes++;
    const agora = await page.evaluate(() => {
      const caixa = document.querySelector(".cenario").getBoundingClientRect();
      return {
        aberto: !document.getElementById("painel").hidden,
        fase: document.getElementById("fase").textContent,
        x: caixa.x,
        y: caixa.y,
        w: caixa.width,
        h: caixa.height,
      };
    });
    fases.add(agora.fase);
    if (agora.aberto) {
      paineis++;
      const botoes = page.locator("#painel button[data-acao]");
      const quantos = await botoes.count();
      if (quantos) await botoes.nth(acaso(quantos)).click({ timeout: 2000 }).catch(() => {});
      await page.waitForTimeout(120);
      continue;
    }
    const ponto = () => ({ x: agora.x + 4 + Math.random() * (agora.w - 8), y: agora.y + 4 + Math.random() * (agora.h - 8) });
    const sorte = Math.random();
    if (sorte < 0.45) {
      const { x, y } = ponto();
      await page.mouse.click(x, y);
    } else if (sorte < 0.7) {
      const de = ponto();
      const para = ponto();
      await page.mouse.move(de.x, de.y);
      await page.mouse.down();
      await page.mouse.move(para.x, para.y, { steps: 5 });
      // Às vezes o dedo sai da tela antes de soltar.
      if (Math.random() < 0.1) await page.mouse.move(para.x, 5000);
      await page.mouse.up();
    } else if (sorte < 0.9) {
      const botoes = page.locator(".cenario button:not([disabled]), .cenario [role=button]");
      const quantos = await botoes.count();
      if (quantos) await botoes.nth(acaso(quantos)).click({ timeout: 800, force: Math.random() < 0.3 }).catch(() => {});
    } else if (sorte < 0.97) {
      const tecla = ["ArrowUp", "ArrowLeft", "ArrowRight", "ArrowDown", "Enter", " "][acaso(6)];
      await page.keyboard.down(tecla);
      await page.waitForTimeout(acaso(400));
      await page.keyboard.up(tecla);
    } else {
      // A criança gira o aparelho ou a barra do navegador aparece.
      await page.setViewportSize({ width: largura + acaso(60) - 30, height: altura + acaso(80) - 40 });
    }
    await page.waitForTimeout(40 + acaso(120));
  }
  await contexto.close();
  return { id, acoes, paineis, fases: [...fases].join(","), erros: [...erros] };
}

// Quatro jogos por vez: mais que isso e os jogos de tempo real perdem quadros.
const fila = [...ids];
const resultados = [];
await Promise.all(
  Array.from({ length: 4 }, async () => {
    while (fila.length) resultados.push(await macaco(fila.shift()));
  }),
);
await navegador.close();

for (const { id, acoes, paineis, fases, erros } of resultados.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id))) {
  console.log(`${id.padEnd(12)} ações=${acoes} painéis=${paineis} fases=${fases} erros=${erros.length}`);
  erros.forEach((erro) => console.log(`   ${erro.replaceAll("\n", "\n   ")}`));
}
process.exit(resultados.some(({ erros }) => erros.length) ? 1 : 0);
