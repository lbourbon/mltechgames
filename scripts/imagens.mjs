// Gera as imagens que não são desenhadas à mão: o cartão de cada jogo para quando o link é
// compartilhado (public/img/social/) e os ícones do site para a tela inicial do celular.
// Rode de novo depois de mudar uma capa em public/img/jogos/, um nome em src/lib/jogos.ts
// ou o favicon:  node scripts/imagens.mjs
import { mkdirSync, readFileSync } from "node:fs";
import { chromium } from "@playwright/test";
import { JOGOS } from "../src/lib/jogos.ts";

const TINTA = "#2b2140";
const FUNDO = "#fff8e7";
// Com aspas simples: a lista vai dentro de um atributo style="...".
const FONTE = `ui-rounded, 'SF Pro Rounded', 'Arial Rounded MT Bold', 'Trebuchet MS', sans-serif`;

const svg = (caminho) => `data:image/svg+xml;base64,${readFileSync(caminho).toString("base64")}`;
const capa = (id) => svg(`public/img/jogos/${id}.svg`);
const monstrinho = svg("public/favicon.svg");

const base = `margin:0;font-family:${FONTE};color:${TINTA};background:${FUNDO};overflow:hidden`;

// A capa aparece inteira, sobre uma cópia desfocada dela mesma que preenche os lados. O
// WhatsApp e as redes cortam as bordas: o nome fica numa faixa larga, longe delas.
const cartaoDoJogo = ({ id, nome, cor }) => `<body style="${base};width:1200px;height:630px">
  <div style="position:relative;height:462px;overflow:hidden;background:${cor};border-bottom:8px solid ${TINTA}">
    <div style="position:absolute;inset:-60px;background:url('${capa(id)}') center/cover;filter:blur(28px) saturate(1.1)"></div>
    <img src="${capa(id)}" style="position:absolute;top:26px;left:50%;height:398px;translate:-50% 0;border:6px solid ${TINTA};border-radius:26px;background:${cor}">
  </div>
  <div style="display:flex;align-items:center;gap:28px;height:160px;padding:0 48px">
    <img src="${monstrinho}" style="height:104px">
    <div>
      <div style="font-size:60px;font-weight:800;line-height:1.05">${nome}</div>
      <div style="font-size:30px;font-weight:700;color:#5d5470">ML Tech Games · jogo grátis para crianças</div>
    </div>
  </div>
</body>`;

const cartaoDoSite = () => `<body style="${base};width:1200px;height:630px">
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;padding:22px 22px 0">
    ${JOGOS.slice(0, 8)
      .map(({ id, cor }) => `<div style="aspect-ratio:8/5;background:${cor} url('${capa(id)}') center/cover;border:6px solid ${TINTA};border-radius:22px"></div>`)
      .join("")}
  </div>
  <div style="display:flex;align-items:center;gap:28px;height:210px;padding:0 48px">
    <img src="${monstrinho}" style="height:120px">
    <div>
      <div style="font-size:72px;font-weight:800;line-height:1.05">ML Tech Games</div>
      <div style="font-size:34px;font-weight:700;color:#5d5470">Jogos grátis para crianças, sem anúncios e sem baixar nada</div>
    </div>
  </div>
</body>`;

// O ícone ocupa o miolo: o celular recorta os cantos como quiser (maskable).
const icone = (lado) => `<body style="${base};width:${lado}px;height:${lado}px;display:grid;place-items:center">
  <img src="${monstrinho}" style="width:62%">
</body>`;

mkdirSync("public/img/social", { recursive: true });
const navegador = await chromium.launch({ channel: process.env.CI ? undefined : "chrome" });
const page = await navegador.newPage();

async function fotografar(html, largura, altura, arquivo) {
  await page.setViewportSize({ width: largura, height: altura });
  await page.setContent(html);
  await page.screenshot(arquivo.endsWith(".jpg") ? { path: arquivo, type: "jpeg", quality: 82 } : { path: arquivo });
  console.log(arquivo);
}

for (const jogo of JOGOS) await fotografar(cartaoDoJogo(jogo), 1200, 630, `public/img/social/${jogo.id}.jpg`);
await fotografar(cartaoDoSite(), 1200, 630, "public/img/social/site.jpg");
await fotografar(icone(180), 180, 180, "public/apple-touch-icon.png");
await fotografar(icone(192), 192, 192, "public/img/icone-192.png");
await fotografar(icone(512), 512, 512, "public/img/icone-512.png");

await navegador.close();
