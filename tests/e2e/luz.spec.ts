import { expect, test, type Page } from "@playwright/test";
import { progressoLocal } from "./ajuda";

const pronta = (page: Page) => expect(page.locator("#vila")).toHaveAttribute("data-pronta", "1", { timeout: 15_000 });

async function abrirNaFase(page: Page, fase: number) {
  await page.addInitScript((f) => localStorage.setItem("mltg:progresso:luz", JSON.stringify({ recorde: 0, fase: f })), fase);
  await page.goto("/jogos/luz/");
  await page.getByRole("button", { name: `Continuar da fase ${fase}` }).click();
}

const primeiroFio = (page: Page) => page.locator(".peca.fio").first();

// Gasta toques em um fio só, o que nunca liga a vila inteira nas fases com limite.
async function gastarToques(page: Page, quantos: number) {
  await page.evaluate((vezes) => {
    const fio = document.querySelector<HTMLButtonElement>(".peca.fio")!;
    for (let i = 0; i < vezes; i++) fio.click();
  }, quantos);
}

const restam = async (page: Page) => Number(await page.locator("#restam").textContent());

test("gira os fios, a vila acende e a fase fica salva", async ({ page }) => {
  await page.goto("/jogos/luz/");
  await page.getByRole("button", { name: "Jogar", exact: true }).click();
  await pronta(page);
  await expect(page.locator("#restam")).toBeHidden();

  // A dica aparece para quem gira há muito tempo sem resolver.
  const dica = page.locator("#dica");
  const fimDaFase = page.getByRole("heading", { name: "Fase 1 completa!" });
  await expect(async () => {
    if (!(await dica.isVisible())) await primeiroFio(page).click({ timeout: 300 }).catch(() => {});
    else await dica.click({ timeout: 300 }).catch(() => {});
    await expect(fimDaFase).toBeVisible({ timeout: 50 });
  }).toPass({ timeout: 30_000, intervals: [60] });

  await expect(page.locator("#painel")).toContainText("+10 pontos");
  await expect(page.locator(".peca.acesa")).not.toHaveCount(0);
  await expect(page.locator("#vila")).toHaveAttribute("data-acesa", "1");
  // O desenho da casa mora em um symbol, e só uma variável chega até a janela.
  const janela = await page.locator(".peca.acesa").first().evaluate((el) => getComputedStyle(el).getPropertyValue("--janela"));
  expect(janela).toBe("#ffc933");
  expect((await progressoLocal(page, "luz")).fase).toBe(2);

  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.locator(".placa")).toContainText("Fase 2");
  await expect(page.locator(".peca.acesa")).toHaveCount(0);
  await expect(page.locator("#dica")).toBeHidden();
});

test("o fio gira sempre para o mesmo lado", async ({ page }) => {
  await page.goto("/jogos/luz/");
  await page.getByRole("button", { name: "Jogar", exact: true }).click();
  await pronta(page);
  const giro = () => primeiroFio(page).locator("svg").evaluate((el: SVGElement) => parseInt(el.style.rotate));
  const inicio = await giro();
  await primeiroFio(page).click();
  expect(await giro()).toBe(inicio + 90);
});

test("na estreia do limite a fase explica, e cada toque desconta", async ({ page }) => {
  await abrirNaFase(page, 3);
  await expect(page.locator("#painel")).toContainText("Toques contados");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await pronta(page);

  const antes = await restam(page);
  await primeiroFio(page).click();
  await expect(page.locator("#restam")).toHaveText(String(antes - 1));
});

test("acabar os toques apaga a vila, e a mesma fase volta do começo", async ({ page }) => {
  await abrirNaFase(page, 3);
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await pronta(page);

  const desenho = () =>
    page.locator(".peca").evaluateAll((pecas) => pecas.map((p) => p.className.replace(/ ?viva/, "") + p.querySelector("svg")?.style.rotate));
  const inicio = await page.locator(".peca").evaluateAll((pecas) => pecas.map((p) => p.querySelector("path")?.getAttribute("d")));
  const giros = await desenho();
  const total = await restam(page);

  await gastarToques(page, total);
  await expect(page.getByRole("heading", { name: "Apagão!" })).toBeVisible();
  await expect(page.locator("#vidas")).toHaveAttribute("aria-label", "2 vidas");

  await page.getByRole("button", { name: "Tentar de novo" }).click();
  await pronta(page);
  await expect(page.locator("#dica")).toBeVisible();
  expect(await restam(page)).toBe(total);
  expect(await page.locator(".peca").evaluateAll((pecas) => pecas.map((p) => p.querySelector("path")?.getAttribute("d")))).toEqual(inicio);
  expect(await desenho()).toEqual(giros);
});

test("sem corações, o apagão termina a partida", async ({ page }) => {
  await abrirNaFase(page, 3);
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  for (let vida = 0; vida < 2; vida++) {
    await pronta(page);
    await gastarToques(page, await restam(page));
    await page.getByRole("button", { name: "Tentar de novo" }).click();
  }
  await pronta(page);
  await gastarToques(page, await restam(page));
  await expect(page.getByRole("button", { name: "Jogar de novo" })).toBeVisible();
  await expect(page.locator("#painel")).toContainText("foi dormir mais cedo");
});

test("a fábrica estreia com a explicação e mostra os dois fios que pede", async ({ page }) => {
  await abrirNaFase(page, 5);
  await expect(page.locator("#painel")).toContainText("dois fios");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await pronta(page);
  await expect(page.locator(".peca.fabrica .tomadas i")).toHaveCount(2);
});

test("a bateria estreia com a explicação e mostra quantas casas aguenta", async ({ page }) => {
  await abrirNaFase(page, 7);
  await expect(page.locator("#painel")).toContainText("bateria");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await pronta(page);
  expect(Number(await page.locator(".carga").textContent())).toBeGreaterThanOrEqual(2);
});
