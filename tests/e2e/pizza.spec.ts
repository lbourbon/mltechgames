import { expect, test, type Page } from "@playwright/test";
import { cortesQueServem, INTEIRO, medidas, type Parte, type Pedido, type Sabor } from "../../src/jogos/pizza/logica";
import { progressoLocal } from "./ajuda";

const pronta = (page: Page) => expect(page.locator(".jogo")).toHaveAttribute("data-travado", "", { timeout: 15_000 });

async function abrirNaFase(page: Page, fase: number) {
  await page.addInitScript((f) => localStorage.setItem("mltg:progresso:pizza", JSON.stringify({ recorde: 0, fase: f })), fase);
  await page.goto("/jogos/pizza/");
  await page.getByRole("button", { name: `Continuar da fase ${fase}` }).click();
  const novidade = page.getByRole("button", { name: "Continuar", exact: true });
  if (await novidade.isVisible()) await novidade.click();
  await pronta(page);
}

async function comecar(page: Page) {
  await page.goto("/jogos/pizza/");
  await page.getByRole("button", { name: "Jogar", exact: true }).click();
  await pronta(page);
}

// O pedido é lido da tela, igual à criança.
async function lerPedido(page: Page): Promise<Pedido> {
  return page.locator("#pedido").evaluate((el) => {
    const partes = [...el.querySelectorAll<HTMLElement>(".parte:not(.parte-resto)")].map((parte) => ({
      sabor: parte.dataset.sabor,
      n: Number(parte.dataset.n),
      d: Number(parte.dataset.d),
    }));
    const resto = el.querySelector<HTMLElement>(".parte-resto")?.dataset.sabor ?? null;
    return { partes, resto } as { partes: Parte[]; resto: Sabor | null };
  });
}

const fatias = (page: Page) => page.locator(".pedaco");
const servir = (page: Page) => page.locator("#servir").click();
const coracoes = (page: Page, vidas: number) => expect(page.locator("#vidas")).toHaveAttribute("aria-label", `${vidas} vidas`);

// Um ponto no meio de uma fatia. Calculado pelo ângulo, porque o clique no centro do desenho erra as fatias grandes.
async function pontoDaFatia(page: Page, indice: number, total: number) {
  const caixa = (await page.locator("#pizza").boundingBox())!;
  const angulo = ((indice + 0.5) / total) * 2 * Math.PI;
  const raio = caixa.width * 0.3;
  return { x: caixa.x + caixa.width / 2 + raio * Math.sin(angulo), y: caixa.y + caixa.height / 2 - raio * Math.cos(angulo) };
}

async function tocarFatia(page: Page, indice: number, total: number) {
  const { x, y } = await pontoDaFatia(page, indice, total);
  await page.mouse.click(x, y);
}

async function escolherSabor(page: Page, sabor: Sabor) {
  await page.locator(`.pote[data-sabor=${sabor}]`).click();
}

async function montar(page: Page) {
  const pedido = await lerPedido(page);
  let total = await fatias(page).count();
  if (total === 0) {
    total = cortesQueServem(pedido)[0];
    await page.locator(`.corte[data-corte="${total}"]`).click();
  }
  let fatia = 0;
  for (const [sabor, valor] of medidas(pedido)) {
    await escolherSabor(page, sabor);
    for (let i = 0; i < valor / (INTEIRO / total); i++) await tocarFatia(page, fatia++, total);
  }
}

// Cobre uma fatia a menos que o pedido, o que sempre está errado.
async function montarErrado(page: Page) {
  const pedido = await lerPedido(page);
  let total = await fatias(page).count();
  if (total === 0) {
    total = cortesQueServem(pedido)[0];
    await page.locator(`.corte[data-corte="${total}"]`).click();
  }
  const [sabor, valor] = [...medidas(pedido)][0];
  const quantas = valor / (INTEIRO / total);
  await escolherSabor(page, sabor);
  for (let i = 0; i < Math.max(quantas - 1, 0); i++) await tocarFatia(page, i, total);
  // Pedido de uma fatia só: cobre duas para não servir uma pizza vazia.
  if (quantas === 1) for (let i = 0; i < 2; i++) await tocarFatia(page, i, total);
}

test("lê o pedido, cobre as fatias, serve todo mundo e a fase fica salva", async ({ page }) => {
  await comecar(page);
  await expect(page.locator("#cortes")).toBeHidden();
  const pedidos = await page.locator("#fila .marca").count();
  for (let i = 0; i < pedidos; i++) {
    await pronta(page);
    await montar(page);
    await servir(page);
    if (i < pedidos - 1) await expect(page.locator("#fila .marca.feita")).toHaveCount(i + 1, { timeout: 10_000 });
  }
  await expect(page.getByRole("heading", { name: "Fase 1 completa!" })).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("#painel")).toContainText("Nenhum pedido errado");
  expect((await progressoLocal(page, "pizza")).fase).toBe(2);
});

test("arrastar o dedo cobre várias fatias de uma vez, e tocar de novo limpa", async ({ page }) => {
  await abrirNaFase(page, 3);
  await page.locator('.corte[data-corte="8"]').click();
  await expect(fatias(page)).toHaveCount(8);

  const de = await pontoDaFatia(page, 0, 8);
  const ate = await pontoDaFatia(page, 3, 8);
  await page.mouse.move(de.x, de.y);
  await page.mouse.down();
  await page.mouse.move(ate.x, ate.y, { steps: 10 });
  await page.mouse.up();
  await expect(page.locator(".pedaco:not([data-sabor=''])")).toHaveCount(4);

  await tocarFatia(page, 0, 8);
  await expect(page.locator(".pedaco:not([data-sabor=''])")).toHaveCount(3);
});

test("a pizza inteira não recebe sabor, e cortar de novo começa outra", async ({ page }) => {
  await abrirNaFase(page, 3);
  await expect(fatias(page)).toHaveCount(0);
  await page.locator("#pizza").click();
  await expect(page.locator("#fala")).toContainText("Corte a pizza");
  await servir(page);
  await expect(page.locator("#fala")).toContainText("Corte a pizza");

  await page.locator('.corte[data-corte="4"]').click();
  await tocarFatia(page, 0, 4);
  await expect(page.locator(".pedaco:not([data-sabor=''])")).toHaveCount(1);
  await page.locator('.corte[data-corte="6"]').click();
  await expect(fatias(page)).toHaveCount(6);
  await expect(page.locator(".pedaco:not([data-sabor=''])")).toHaveCount(0);
  await coracoes(page, 3);
});

test("pizza errada custa um coração, fica na mesa e o cliente diz o que houve", async ({ page }) => {
  await abrirNaFase(page, 3);
  await montarErrado(page);
  const cobertas = await page.locator(".pedaco:not([data-sabor=''])").count();
  await servir(page);

  await expect(page.locator("#fala")).toContainText(/Faltou|demais/);
  await coracoes(page, 2);
  await pronta(page);
  await expect(page.locator(".pedaco:not([data-sabor=''])")).toHaveCount(cobertas);
  await expect(page.locator("#dica")).toBeVisible();
  await expect(page.locator("#fila .marca.feita")).toHaveCount(0);
});

test("nas primeiras fases a pizza errada não custa coração", async ({ page }) => {
  await comecar(page);
  await montarErrado(page);
  await servir(page);
  await expect(page.locator("#fala")).toContainText(/Faltou|demais/);
  await pronta(page);
  await coracoes(page, 3);
});

test("com dicas chega à pizza certa", async ({ page }) => {
  await abrirNaFase(page, 5);
  await page.locator('.corte[data-corte="3"]').click();
  await tocarFatia(page, 0, 3);
  await servir(page);
  await pronta(page);

  await expect(async () => {
    await page.locator("#dica").click();
    await expect(page.locator("#fala")).toContainText("certinha", { timeout: 50 });
  }).toPass({ timeout: 10_000, intervals: [50] });
  await servir(page);
  await expect(page.locator("#fila .marca.feita")).toHaveCount(1, { timeout: 10_000 });
});

test("três pizzas erradas fecham a pizzaria", async ({ page }) => {
  await abrirNaFase(page, 3);
  await montarErrado(page);
  for (let vidas = 2; vidas > 0; vidas--) {
    await servir(page);
    await coracoes(page, vidas);
    await pronta(page);
  }
  await servir(page);
  await expect(page.getByRole("button", { name: "Jogar de novo" })).toBeVisible();
  await expect(page.locator("#painel")).toContainText("pizzaria fechou");
});

test("cada novidade é explicada, e o cortador único já vem cortado", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("mltg:progresso:pizza", '{"recorde":0,"fase":9}'));
  await page.goto("/jogos/pizza/");
  await page.getByRole("button", { name: "Continuar da fase 9" }).click();
  await expect(page.locator("#painel")).toContainText("cortador de 8");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await pronta(page);
  await expect(fatias(page)).toHaveCount(8);
  await expect(page.locator("#cortes")).toBeHidden();
});

test("o pedido com resto pede para cobrir a pizza inteira", async ({ page }) => {
  await abrirNaFase(page, 7);
  await expect(page.locator(".parte-resto")).toHaveCount(1);
  await montar(page);
  await expect(page.locator(".pedaco[data-sabor='']")).toHaveCount(0);
  await servir(page);
  await expect(page.locator("#fila .marca.feita")).toHaveCount(1, { timeout: 10_000 });
});

test("dá para jogar só com o teclado", async ({ page }) => {
  await abrirNaFase(page, 3);
  await page.locator('.corte[data-corte="4"]').focus();
  await page.keyboard.press("Enter");
  await expect(fatias(page)).toHaveCount(4);
  await fatias(page).first().focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".pedaco:not([data-sabor=''])")).toHaveCount(1);
});
