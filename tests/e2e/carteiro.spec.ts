import { expect, test, type Page } from "@playwright/test";
import { progressoLocal } from "./ajuda";

test.use({ reducedMotion: "reduce" });

const pronto = (page: Page) => expect(page.locator("#espaco")).toHaveAttribute("data-pronto", "1", { timeout: 15_000 });

async function abrirNaFase(page: Page, fase: number) {
  await page.addInitScript((f) => localStorage.setItem("mltg:progresso:carteiro", JSON.stringify({ recorde: 0, fase: f })), fase);
  await page.goto("/jogos/carteiro/");
  await page.getByRole("button", { name: `Continuar da fase ${fase}` }).click();
}

// Arrasta a partir do astronauta na direção do ângulo (em graus, 0 é para a direita e -90 para
// cima) e solta. A força vai de 0 a 1.
async function lancar(page: Page, graus: number, forca: number, soltar = true) {
  const caixa = (await page.locator("#espaco").boundingBox())!;
  const { x, y } = await page.locator("#lancador").evaluate((el) => ({ x: parseFloat(el.style.left) / 100, y: parseFloat(el.style.top) / 100 }));
  const ox = caixa.x + x * caixa.width;
  const oy = caixa.y + y * caixa.height;
  const angulo = (graus * Math.PI) / 180;
  const distancia = Math.max(0.01, forca * 0.42) * caixa.width;
  await page.mouse.move(ox + Math.cos(angulo) * 30, oy + Math.sin(angulo) * 30);
  await page.mouse.down();
  await page.mouse.move(ox + Math.cos(angulo) * distancia, oy + Math.sin(angulo) * distancia, { steps: 4 });
  if (soltar) await page.mouse.up();
}

const pacotes = (page: Page) => page.locator("#pacotes").textContent();

test("a mira aparece ao arrastar, e soltar perto do astronauta desiste", async ({ page }) => {
  await abrirNaFase(page, 6);
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await pronto(page);
  const antes = await pacotes(page);

  await lancar(page, -90, 0.8, false);
  await expect(page.locator("#espaco")).toHaveAttribute("data-mirando", "1");
  const { x, y } = (await page.locator("#lancador").boundingBox())!;
  await page.mouse.move(x + 20, y + 30);
  await page.mouse.up();
  await expect(page.locator("#espaco")).toHaveAttribute("data-mirando", "");
  expect(await pacotes(page)).toBe(antes);
  await expect(page.locator(".rastro")).toHaveCount(0);
});

test("varrendo a mira, o pacote chega e a fase fica salva", async ({ page }) => {
  await page.goto("/jogos/carteiro/");
  await page.getByRole("button", { name: "Jogar", exact: true }).click();
  const fim = page.getByRole("heading", { name: "Fase 1 completa!" });
  // A fase 1 não tem limite de pacotes: abre a mira aos poucos a partir de cima.
  for (let tiro = 0; tiro < 120 && !(await fim.isVisible()); tiro++) {
    await pronto(page).catch(() => {});
    if (await fim.isVisible()) break;
    const desvio = (tiro % 2 ? 1 : -1) * Math.ceil(tiro / 2) * 3;
    await lancar(page, -90 + desvio, tiro % 3 === 0 ? 0.6 : 0.85);
    await page.waitForTimeout(150);
  }
  await expect(fim).toBeVisible({ timeout: 15_000 });
  expect((await progressoLocal(page, "carteiro")).fase).toBe(2);
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.locator("#painel")).toContainText("Júpiter");
});

test("quando os pacotes acabam, perde uma vida e o mesmo céu volta com os rastros", async ({ page }) => {
  await abrirNaFase(page, 3);
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await pronto(page);
  const ceu = await page.locator(".corpo").evaluateAll((corpos) => corpos.map((c) => (c as HTMLElement).style.left));

  // Para baixo, o pacote sempre se perde.
  for (let tiro = 0; tiro < 3; tiro++) {
    await pronto(page);
    await lancar(page, 90, 1);
    await page.waitForTimeout(200);
  }
  await expect(page.getByRole("heading", { name: "Acabaram os pacotes!" })).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("#vidas")).toHaveAttribute("aria-label", "2 vidas");

  await page.getByRole("button", { name: "Tentar de novo" }).click();
  await pronto(page);
  expect(await pacotes(page)).toBe("3");
  await expect(page.locator(".rastro")).not.toHaveCount(0);
  expect(await page.locator(".corpo").evaluateAll((corpos) => corpos.map((c) => (c as HTMLElement).style.left))).toEqual(ceu);
});
