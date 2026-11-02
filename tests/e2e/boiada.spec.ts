import { expect, test, type Page } from "@playwright/test";
import { progressoLocal } from "./ajuda";

// Toca na porteira aberta que dá a maior boiada, o que basta para vencer as fases fáceis.
async function tocarMaior(page: Page) {
  const indice = await page.evaluate(() => {
    const boiada = Number(document.getElementById("boiada")!.textContent);
    const contas = [...document.querySelectorAll<HTMLElement>(".porteira")].map((botao) => {
      if (botao.classList.contains("fechada")) return 0;
      const texto = botao.querySelector(".porteira-conta")!.textContent!;
      const valor = Number(texto.slice(1));
      return { "+": boiada + valor, "−": boiada - valor, "×": boiada * valor, "÷": boiada / valor }[texto[0]]!;
    });
    return contas.indexOf(Math.max(...contas));
  });
  await page.locator(".porteira").nth(indice).click();
}

test("a boiada cresce, a carroça sai do barro e a fase fica salva", async ({ page }) => {
  await page.goto("/jogos/boiada/");
  await page.getByRole("button", { name: "Jogar", exact: true }).click();

  const inicial = Number(await page.locator("#boiada").textContent());
  const botoes = page.locator(".porteira:not([disabled])");
  const painel = page.locator("#painel");

  await expect(async () => {
    if (await painel.isVisible()) return;
    await expect(botoes.first()).toBeVisible({ timeout: 100 });
    await tocarMaior(page);
    throw new Error("ainda na estrada");
  }).toPass({ timeout: 30_000, intervals: [200] });

  await expect(painel).toContainText("Fase 1 completa");
  expect(Number(await page.locator("#boiada").textContent())).toBeGreaterThan(inicial);
  expect((await progressoLocal(page, "boiada")).fase).toBe(2);
});

test("porteira fechada avisa o motivo e não gasta o trecho", async ({ page }) => {
  // A estrada só muda a cada abertura: recarrega até nascer uma com porteira fechada.
  await page.addInitScript(() => localStorage.setItem("mltg:progresso:boiada", '{"recorde":0,"fase":6}'));
  await expect(async () => {
    await page.goto("/jogos/boiada/");
    await page.getByRole("button", { name: "Continuar da fase 6" }).click();
    await expect(page.locator(".porteira.fechada").first()).toBeVisible({ timeout: 100 });
  }).toPass({ timeout: 60_000 });

  await page.locator(".porteira.fechada").first().click();
  await expect(page.locator("#fala")).toContainText("Essa não abre");
  await expect(page.locator(".marca.feita")).toHaveCount(0);
});
