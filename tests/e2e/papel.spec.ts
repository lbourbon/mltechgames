import { expect, test, type Page } from "@playwright/test";
import { cortesDoMolde, dobrasDo, simetriaDe } from "../../src/jogos/papel/logica";
import { progressoLocal } from "./ajuda";

const pronto = (page: Page) => expect(page.locator("#mesa")).toHaveAttribute("data-pronto", "1", { timeout: 15_000 });

// O molde é lido da tela, igual à criança: as casinhas furadas do papel do varal.
async function lerMolde(page: Page) {
  return page.evaluate(() => {
    const molde = document.getElementById("molde")!;
    const lado = Number(molde.style.getPropertyValue("--lado"));
    return { lado, furos: [...molde.children].flatMap((casa, i) => (casa.classList.contains("furo") ? [i] : [])) };
  });
}

async function cortarCasa(page: Page, casa: number) {
  const caixa = (await page.locator("#folha").boundingBox())!;
  const { lado } = await lerMolde(page);
  await page.mouse.click(caixa.x + ((casa % lado) + 0.5) * (caixa.width / lado), caixa.y + (Math.floor(casa / lado) + 0.5) * (caixa.height / lado));
}

async function recortarCerto(page: Page) {
  const { lado, furos } = await lerMolde(page);
  const dobras = dobrasDo(simetriaDe(furos, lado));
  for (const dobra of dobras) {
    await page.locator(`[data-dobra="${dobra}"]`).click();
    await pronto(page);
  }
  for (const casa of cortesDoMolde(furos, dobras, lado)) await cortarCasa(page, casa);
  await page.getByRole("button", { name: "Abrir" }).click();
}

async function abrirNaFase(page: Page, fase: number) {
  await page.addInitScript((f) => localStorage.setItem("mltg:progresso:papel", JSON.stringify({ recorde: 0, fase: f })), fase);
  await page.goto("/jogos/papel/");
  await page.getByRole("button", { name: fase === 1 ? "Jogar" : `Continuar da fase ${fase}`, exact: true }).click();
  const seguir = page.locator("#painel [data-acao=seguir]");
  if (await seguir.isVisible()) await seguir.click();
  await pronto(page);
}

test("dobra nos espelhos do molde, corta, abre, pendura no varal e salva a fase", async ({ page }) => {
  await page.goto("/jogos/papel/");
  await page.getByRole("button", { name: "Jogar", exact: true }).click();
  await pronto(page);

  await recortarCerto(page);
  await expect(page.locator(".vaga.pendurado")).toHaveCount(1, { timeout: 15_000 });
  await pronto(page);
  await recortarCerto(page);
  await expect(page.locator("#painel")).toContainText("Fase 1 completa", { timeout: 15_000 });
  await expect(page.locator("#painel").getByRole("img", { name: "3 de 3 estrelas" })).toBeVisible();
  expect((await progressoLocal(page, "papel")).fase).toBe(2);
});

test("papel diferente do molde custa coração depois das fases mansas e volta em branco", async ({ page }) => {
  await abrirNaFase(page, 3);
  const { furos } = await lerMolde(page);
  // Uma casa que o molde não fura, sem dobrar nada.
  await cortarCasa(page, [0, 1, 2, 3].find((casa) => !furos.includes(casa))!);
  await page.getByRole("button", { name: "Abrir" }).click();
  await expect(page.locator(".casa.sobra")).toHaveCount(1, { timeout: 10_000 });
  await expect(page.locator("#painel")).toContainText("Ficou diferente do molde", { timeout: 10_000 });
  await expect(page.locator("#vidas")).toHaveAttribute("aria-label", "2 vidas");

  await page.getByRole("button", { name: "Tentar de novo" }).click();
  await expect(page.locator("#folha .casa.furo")).toHaveCount(0);
  await expect(page.locator('[data-dobra="V"]')).toBeEnabled();
  await expect(page.getByRole("button", { name: "Dica" })).toBeVisible();
});

test("a tesoura tem cortes contados e para no limite", async ({ page }) => {
  await abrirNaFase(page, 1);
  const limite = Number(await page.locator("#cortes-restam").textContent());
  for (let casa = 0; casa < 12; casa++) await cortarCasa(page, casa);
  await expect(page.locator("#cortes-restam")).toHaveText("0");
  await expect(page.locator("#folha .casa.furo")).toHaveCount(limite);
  // Depois do corte o papel não dobra mais.
  await expect(page.locator('[data-dobra="V"]')).toBeDisabled();
  await page.getByRole("button", { name: "Papel novo" }).click();
  await expect(page.locator("#cortes-restam")).toHaveText(String(limite));
  await expect(page.locator("#folha .casa.furo")).toHaveCount(0);
});
