import { expect, test, type Page } from "@playwright/test";
import { progressoLocal } from "./ajuda";

const pronta = (page: Page) => expect(page.locator("#delegacia")).toHaveAttribute("data-pronta", "1", { timeout: 15_000 });

async function abrirNaFase(page: Page, fase: number) {
  await page.addInitScript((f) => localStorage.setItem("mltg:progresso:torta", JSON.stringify({ recorde: 0, fase: f })), fase);
  await page.goto("/jogos/torta/");
  await page.getByRole("button", { name: `Continuar da fase ${fase}` }).click();
}

// Toca em todos da fila, um de cada vez, como quem ainda não leu a pista.
const tocarTodos = (page: Page) =>
  page.evaluate(async () => {
    for (const botao of document.querySelectorAll<HTMLButtonElement>(".suspeito:not(.solto)")) {
      botao.click();
      await new Promise((pronto) => setTimeout(pronto, 80));
    }
  });

test("solta os inocentes, as pistas chegam em etapas e o culpado aparece lambuzado", async ({ page }) => {
  await page.goto("/jogos/torta/");
  await page.getByRole("button", { name: "Jogar", exact: true }).click();
  await pronta(page);
  await expect(page.locator(".pista")).toHaveCount(1);

  const flagra = page.locator(".suspeito.culpado");
  await expect(async () => {
    await tocarTodos(page);
    await expect(flagra).toHaveCount(1, { timeout: 100 });
  }).toPass({ timeout: 30_000, intervals: [300] });

  // Duas etapas na fase 1, e errar nas fases mansas não custa coração.
  await expect(page.locator(".pista")).toHaveCount(2);
  await expect(page.locator("#vidas")).toHaveAttribute("aria-label", "3 vidas");
  await expect(page.locator(".suspeito.solto")).toHaveCount(3);
  await expect(flagra).toHaveAttribute("aria-label", /culpado/);

  await expect(page.getByRole("heading", { name: "Fase 1 completa!" })).toBeVisible();
  expect((await progressoLocal(page, "torta")).fase).toBe(2);
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.locator("#painel")).toContainText("Pista com NÃO");
});

test("depois das fases mansas, soltar quem as pistas não livram custa um coração", async ({ page }) => {
  await abrirNaFase(page, 3);
  await expect(page.locator("#painel")).toContainText("Agora é sério");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await pronta(page);

  // Na primeira pista sempre há quem ela não livra: tocando em todos, alguém recusa.
  await tocarTodos(page);
  await expect(page.locator("#vidas")).not.toHaveAttribute("aria-label", "3 vidas");
  await expect(page.locator(".suspeito:not(.solto)")).not.toHaveCount(0);
});

test("sem corações, a partida termina", async ({ page }) => {
  await abrirNaFase(page, 3);
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await pronta(page);
  // Insiste em cada suspeito até ele sair. O culpado nunca sai, então os corações acabam antes do caso.
  await page.evaluate(async () => {
    const espera = () => new Promise((pronto) => setTimeout(pronto, 120));
    for (const botao of document.querySelectorAll<HTMLButtonElement>(".suspeito")) {
      for (let vez = 0; vez < 3 && !botao.classList.contains("solto"); vez++) {
        while (document.getElementById("delegacia")!.dataset.pronta !== "1" && document.getElementById("painel")!.hidden) await espera();
        if (!document.getElementById("painel")!.hidden) return;
        botao.click();
        await espera();
      }
    }
  });
  await expect(page.getByRole("button", { name: "Jogar de novo" })).toBeVisible({ timeout: 10_000 });
  await expect(page.locator("#painel")).toContainText("fugiu com o prato");
});
